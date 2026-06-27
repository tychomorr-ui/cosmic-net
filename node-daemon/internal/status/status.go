// Package status serves a signed /status payload. The signature is over the
// canonical JSON of the payload MINUS the sig field, keys lexicographic, no
// whitespace. The control plane (src/lib/probe-signed.ts) reproduces this
// canonical form and verifies with the node's pinned ed25519 pubkey.
package status

import (
	"bytes"
	"crypto/ed25519"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"time"

	"nexinus/archangel/internal/wg"
)

type Signer struct {
	priv  ed25519.PrivateKey
	iface string
}

func Open(etc, iface string) (*Signer, error) {
	priv, err := os.ReadFile(filepath.Join(etc, "server.ed25519"))
	if err != nil {
		return nil, err
	}
	return &Signer{priv: ed25519.PrivateKey(priv), iface: iface}, nil
}

type payload struct {
	TS     int64       `json:"ts"`
	WG     wgBlock     `json:"wg"`
	SOCKS5 socksBlock  `json:"socks5"`
	DNS    dnsBlock    `json:"dns"`
	Sig    string      `json:"sig_ed25519"`
}

type wgBlock struct {
	Iface                string `json:"iface"`
	Peers                int    `json:"peers"`
	LastHandshakeMaxAgeS int64  `json:"last_handshake_max_age_s"`
}

type socksBlock struct {
	Listen      string `json:"listen"`
	ActiveConns int    `json:"active_conns"`
}

type dnsBlock struct {
	Zone    string `json:"zone"`
	Records int    `json:"records"`
}

func (s *Signer) Handle(wgm *wg.Manager) http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		st, err := wgm.Stats()
		if err != nil {
			http.Error(w, "wg stats: "+err.Error(), 500)
			return
		}
		p := payload{
			TS: time.Now().Unix(),
			WG: wgBlock{
				Iface:                wgm.Iface(),
				Peers:                st.Peers,
				LastHandshakeMaxAgeS: st.LastHandshakeMaxAgeS,
			},
			SOCKS5: socksBlock{Listen: wgm.GatewayIP() + ":1080", ActiveConns: 0},
			DNS:    dnsBlock{Zone: "xinus.", Records: countRecords()},
		}
		canon, err := canonicalize(p)
		if err != nil {
			http.Error(w, "canon: "+err.Error(), 500)
			return
		}
		sig := ed25519.Sign(s.priv, canon)
		p.Sig = hex.EncodeToString(sig)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(p)
	}
}

// canonicalize: stable lexicographic key order, no whitespace, omit sig.
func canonicalize(p payload) ([]byte, error) {
	m := map[string]any{
		"ts": p.TS,
		"wg": map[string]any{
			"iface":                    p.WG.Iface,
			"last_handshake_max_age_s": p.WG.LastHandshakeMaxAgeS,
			"peers":                    p.WG.Peers,
		},
		"socks5": map[string]any{
			"active_conns": p.SOCKS5.ActiveConns,
			"listen":       p.SOCKS5.Listen,
		},
		"dns": map[string]any{
			"records": p.DNS.Records,
			"zone":    p.DNS.Zone,
		},
	}
	return stableJSON(m)
}

func stableJSON(v any) ([]byte, error) {
	switch x := v.(type) {
	case map[string]any:
		keys := make([]string, 0, len(x))
		for k := range x {
			keys = append(keys, k)
		}
		sort.Strings(keys)
		var buf bytes.Buffer
		buf.WriteByte('{')
		for i, k := range keys {
			if i > 0 {
				buf.WriteByte(',')
			}
			kb, _ := json.Marshal(k)
			buf.Write(kb)
			buf.WriteByte(':')
			vb, err := stableJSON(x[k])
			if err != nil {
				return nil, err
			}
			buf.Write(vb)
		}
		buf.WriteByte('}')
		return buf.Bytes(), nil
	default:
		return json.Marshal(v)
	}
}

func countRecords() int {
	// Read CoreDNS zone file; cheap and avoids tight coupling.
	b, err := os.ReadFile("/etc/archangel/xinus.zone")
	if err != nil {
		return 0
	}
	n := 0
	for _, line := range bytes.Split(b, []byte("\n")) {
		s := bytes.TrimSpace(line)
		if len(s) == 0 || s[0] == ';' || s[0] == '$' {
			continue
		}
		n++
	}
	_ = fmt.Sprintf
	return n
}
