// Package handshake implements ARCHANGEL/v0:
//
//   GET  /archangel/challenge → { nonce, exp, srv_pub }
//   POST /archangel/enroll    → verify ed25519 sig over the canonical
//                                message, allocate /32, install WG peer.
package handshake

import (
	"crypto/ed25519"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"sync"
	"time"

	"nexinus/archangeld/internal/wg"
)

const (
	nonceTTL    = 60 * time.Second
	nonceLen    = 32
	edPrivFile  = "server.ed25519"
	edPubFile   = "server.ed25519.pub"
	xPrivFile   = "server.x25519"
	xPubFile    = "server.x25519.pub"
	allowFile   = "allowlist.json"
	receiptsDir = "receipts"
)

type allowlist struct {
	Operators []string `json:"operators"`
}

type Service struct {
	etc      string
	edPriv   ed25519.PrivateKey
	edPub    ed25519.PublicKey
	xPubHex  string

	mu      sync.Mutex
	allow   map[string]struct{}
	nonces  map[string]time.Time
}

// Init generates server keys on first boot.
func Init(etc string) error {
	if err := os.MkdirAll(etc, 0o750); err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Join(etc, receiptsDir), 0o750); err != nil {
		return err
	}
	if _, err := os.Stat(filepath.Join(etc, edPrivFile)); err == nil {
		return errors.New("ed25519 already initialized")
	}
	pub, priv, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		return err
	}
	if err := writeKey(filepath.Join(etc, edPrivFile), priv); err != nil {
		return err
	}
	if err := writePub(filepath.Join(etc, edPubFile), pub); err != nil {
		return err
	}
	// x25519 server pubkey is the wg server key; archangeld also keeps a
	// parallel x25519 keypair for any future application-layer ECDH.
	x := make([]byte, 32)
	if _, err := rand.Read(x); err != nil {
		return err
	}
	if err := writeKey(filepath.Join(etc, xPrivFile), x); err != nil {
		return err
	}
	if err := writePub(filepath.Join(etc, xPubFile), x); err != nil {
		return err
	}
	if _, err := os.Stat(filepath.Join(etc, allowFile)); errors.Is(err, os.ErrNotExist) {
		empty, _ := json.MarshalIndent(allowlist{Operators: []string{}}, "", "  ")
		_ = os.WriteFile(filepath.Join(etc, allowFile), empty, 0o640)
	}
	return nil
}

func Open(etc string) (*Service, error) {
	priv, err := os.ReadFile(filepath.Join(etc, edPrivFile))
	if err != nil {
		return nil, fmt.Errorf("load ed25519 priv (run `archangeld init`): %w", err)
	}
	pub, err := os.ReadFile(filepath.Join(etc, edPubFile))
	if err != nil {
		return nil, err
	}
	xpub, err := os.ReadFile(filepath.Join(etc, xPubFile))
	if err != nil {
		return nil, err
	}
	s := &Service{
		etc:     etc,
		edPriv:  ed25519.PrivateKey(priv),
		edPub:   ed25519.PublicKey(pub),
		xPubHex: hex.EncodeToString(xpub),
		nonces:  make(map[string]time.Time),
	}
	if err := s.ReloadAllowlist(); err != nil {
		return nil, err
	}
	return s, nil
}

func LoadPubkeys(etc string) (edPubHex, xPubHex string, err error) {
	ed, err := os.ReadFile(filepath.Join(etc, edPubFile))
	if err != nil {
		return "", "", err
	}
	x, err := os.ReadFile(filepath.Join(etc, xPubFile))
	if err != nil {
		return "", "", err
	}
	return hex.EncodeToString(ed), hex.EncodeToString(x), nil
}

func (s *Service) ReloadAllowlist() error {
	raw, err := os.ReadFile(filepath.Join(s.etc, allowFile))
	if err != nil {
		return err
	}
	var a allowlist
	if err := json.Unmarshal(raw, &a); err != nil {
		return err
	}
	m := make(map[string]struct{}, len(a.Operators))
	for _, op := range a.Operators {
		m[op] = struct{}{}
	}
	s.mu.Lock()
	s.allow = m
	s.mu.Unlock()
	return nil
}

type challengeResp struct {
	Nonce  string `json:"nonce"`
	Exp    int64  `json:"exp"`
	SrvPub string `json:"srv_pub"`
}

func (s *Service) HandleChallenge(w http.ResponseWriter, _ *http.Request) {
	b := make([]byte, nonceLen)
	if _, err := rand.Read(b); err != nil {
		http.Error(w, "rand", 500)
		return
	}
	n := hex.EncodeToString(b)
	exp := time.Now().Add(nonceTTL)
	s.mu.Lock()
	s.nonces[n] = exp
	s.gcNoncesLocked()
	s.mu.Unlock()
	writeJSON(w, challengeResp{
		Nonce:  n,
		Exp:    exp.Unix(),
		SrvPub: hex.EncodeToString(s.edPub),
	})
}

func (s *Service) gcNoncesLocked() {
	now := time.Now()
	for k, v := range s.nonces {
		if v.Before(now) {
			delete(s.nonces, k)
		}
	}
}

type enrollReq struct {
	V              string `json:"v"`
	Nonce          string `json:"nonce"`
	ClientEdPub    string `json:"client_ed_pub"`
	ClientX25519   string `json:"client_x25519_pub"`
	DeviceLabel    string `json:"device_label"`
	SigEd25519     string `json:"sig_ed25519"`
}

type enrollResp struct {
	AssignedIP      string `json:"assigned_ip"`
	ServerX25519Pub string `json:"server_x25519_pub"`
	ServerEndpoint  string `json:"server_endpoint"`
	DNS             string `json:"dns"`
	CIDv1Receipt    string `json:"cidv1_receipt"`
}

func (s *Service) HandleEnroll(wgm *wg.Manager, endpoint string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method", 405)
			return
		}
		body, err := io.ReadAll(io.LimitReader(r.Body, 8192))
		if err != nil {
			http.Error(w, "read", 400)
			return
		}
		var req enrollReq
		if err := json.Unmarshal(body, &req); err != nil {
			http.Error(w, "json", 400)
			return
		}
		if req.V != "ARCHANGEL/v0" {
			http.Error(w, "version", 400)
			return
		}

		// Nonce single-use + expiry.
		s.mu.Lock()
		exp, ok := s.nonces[req.Nonce]
		if ok {
			delete(s.nonces, req.Nonce)
		}
		_, allowed := s.allow[req.ClientEdPub]
		s.mu.Unlock()
		if !ok || time.Now().After(exp) {
			http.Error(w, "nonce", 401)
			return
		}
		if !allowed {
			http.Error(w, "not on allowlist", 403)
			return
		}

		// Verify ed25519 signature over canonical message.
		msg := fmt.Sprintf("ARCHANGEL/v0\n%s\n%s", req.Nonce, req.ClientX25519)
		sig, err := hex.DecodeString(req.SigEd25519)
		if err != nil {
			http.Error(w, "sig hex", 400)
			return
		}
		edPub, err := hex.DecodeString(req.ClientEdPub)
		if err != nil || len(edPub) != ed25519.PublicKeySize {
			http.Error(w, "ed pub", 400)
			return
		}
		if !ed25519.Verify(edPub, []byte(msg), sig) {
			http.Error(w, "signature", 401)
			return
		}

		// Install peer.
		xPub, err := hex.DecodeString(req.ClientX25519)
		if err != nil || len(xPub) != 32 {
			http.Error(w, "x25519 pub", 400)
			return
		}
		ip, err := wgm.AddPeer(xPub)
		if err != nil {
			http.Error(w, "wg: "+err.Error(), 500)
			return
		}

		resp := enrollResp{
			AssignedIP:      ip + "/32",
			ServerX25519Pub: wgm.ServerPubBase64(),
			ServerEndpoint:  endpoint,
			DNS:             wgm.GatewayIP(),
			CIDv1Receipt:    "computed-client-side",
		}
		// Persist a receipt on disk for the audit trail.
		_ = persistReceipt(s.etc, req, resp)
		writeJSON(w, resp)
	}
}

func persistReceipt(etc string, req enrollReq, resp enrollResp) error {
	name := fmt.Sprintf("%d-%s.json", time.Now().Unix(), req.ClientEdPub[:16])
	out := map[string]any{"req": req, "resp": resp, "at": time.Now().UTC().Format(time.RFC3339)}
	b, _ := json.MarshalIndent(out, "", "  ")
	return os.WriteFile(filepath.Join(etc, receiptsDir, name), b, 0o640)
}

func writeKey(p string, b []byte) error { return os.WriteFile(p, b, 0o600) }
func writePub(p string, b []byte) error { return os.WriteFile(p, b, 0o644) }

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}
