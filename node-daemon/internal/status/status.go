// Package status serves a signed /status payload. The wire format and the
// canonicalizer used to produce the signed bytes are defined in the shared
// ARCHANGEL/v0 spec (packages/protocol/spec/archangel.v0.json) and
// implemented in internal/protocol. Golden vectors guarantee byte-identical
// output with the browser verifier (src/lib/probe-signed.ts).
package status

import (
	"bytes"
	"crypto/ed25519"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"nexinus/archangel/internal/protocol"
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

func (s *Signer) Handle(wgm *wg.Manager) http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		st, err := wgm.Stats()
		if err != nil {
			http.Error(w, "wg stats: "+err.Error(), 500)
			return
		}
		p := protocol.StatusPayload{
			TS: time.Now().Unix(),
			WG: protocol.WgBlock{
				Iface:                wgm.Iface(),
				Peers:                st.Peers,
				LastHandshakeMaxAgeS: st.LastHandshakeMaxAgeS,
			},
			SOCKS5: protocol.Socks5Block{Listen: wgm.GatewayIP() + ":1080", ActiveConns: 0},
			DNS:    protocol.DnsBlock{Zone: "xinus.", Records: countRecords()},
		}
		canon, err := protocol.Canonicalize(p)
		if err != nil {
			http.Error(w, "canon: "+err.Error(), 500)
			return
		}
		sig := ed25519.Sign(s.priv, canon)
		signed := protocol.SignedStatus{
			StatusPayload: p,
			Sig:           hex.EncodeToString(sig),
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(signed)
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
	return n
}

