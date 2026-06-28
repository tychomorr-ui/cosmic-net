// Package protocol is the Go side of ARCHANGEL/v0. The TS mirror lives at
// ../ts/index.ts. The spec lives at ../spec/archangel.v0.json. Golden
// vectors at ../spec/golden-vectors.json enforce byte-identical output
// across both stacks — any drift breaks signature verification silently.
package protocol

import (
	"bytes"
	"encoding/json"
)

// Version is the wire-format version string. Any breaking change becomes v1
// in a new spec file rather than mutating v0.
const Version = "ARCHANGEL/v0"

// StatelessTTLSeconds is the freshness ceiling enforced by stateless
// verifiers (the browser). Aggregators apply counter monotonicity instead.
const StatelessTTLSeconds = 120

// WgBlock — fields inside the wg object on the wire.
type WgBlock struct {
	Iface                string `json:"iface"`
	Peers                int    `json:"peers"`
	LastHandshakeMaxAgeS int64  `json:"last_handshake_max_age_s"`
}

// Socks5Block — fields inside the socks5 object on the wire.
type Socks5Block struct {
	Listen      string `json:"listen"`
	ActiveConns int    `json:"active_conns"`
}

// DnsBlock — fields inside the dns object on the wire.
type DnsBlock struct {
	Zone    string `json:"zone"`
	Records int    `json:"records"`
}

// StatusPayload is the input to Canonicalize. The signature is not part of it.
type StatusPayload struct {
	TS     int64       `json:"ts"`
	WG     WgBlock     `json:"wg"`
	SOCKS5 Socks5Block `json:"socks5"`
	DNS    DnsBlock    `json:"dns"`
}

// SignedStatus is the StatusPayload with an embedded ed25519 signature as
// lowercase hex over the canonical bytes of StatusPayload.
type SignedStatus struct {
	StatusPayload
	Sig string `json:"sig_ed25519"`
}

// Canonicalize produces the exact bytes the verifier checks. Sorted keys,
// no whitespace, sig_ed25519 omitted. The shape is hand-rolled (rather than
// a generic sort) so any future field addition is a deliberate edit here AND
// in ../ts/index.ts, never an accident of map iteration order.
func Canonicalize(p StatusPayload) ([]byte, error) {
	var buf bytes.Buffer
	buf.WriteByte('{')

	// dns
	buf.WriteString(`"dns":{`)
	buf.WriteString(`"records":`)
	if err := writeJSON(&buf, p.DNS.Records); err != nil {
		return nil, err
	}
	buf.WriteString(`,"zone":`)
	if err := writeJSON(&buf, p.DNS.Zone); err != nil {
		return nil, err
	}
	buf.WriteByte('}')

	// socks5
	buf.WriteString(`,"socks5":{`)
	buf.WriteString(`"active_conns":`)
	if err := writeJSON(&buf, p.SOCKS5.ActiveConns); err != nil {
		return nil, err
	}
	buf.WriteString(`,"listen":`)
	if err := writeJSON(&buf, p.SOCKS5.Listen); err != nil {
		return nil, err
	}
	buf.WriteByte('}')

	// ts
	buf.WriteString(`,"ts":`)
	if err := writeJSON(&buf, p.TS); err != nil {
		return nil, err
	}

	// wg
	buf.WriteString(`,"wg":{`)
	buf.WriteString(`"iface":`)
	if err := writeJSON(&buf, p.WG.Iface); err != nil {
		return nil, err
	}
	buf.WriteString(`,"last_handshake_max_age_s":`)
	if err := writeJSON(&buf, p.WG.LastHandshakeMaxAgeS); err != nil {
		return nil, err
	}
	buf.WriteString(`,"peers":`)
	if err := writeJSON(&buf, p.WG.Peers); err != nil {
		return nil, err
	}
	buf.WriteByte('}')

	buf.WriteByte('}')
	return buf.Bytes(), nil
}

func writeJSON(buf *bytes.Buffer, v any) error {
	b, err := json.Marshal(v)
	if err != nil {
		return err
	}
	buf.Write(b)
	return nil
}
