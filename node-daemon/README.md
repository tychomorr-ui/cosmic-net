# archangel

Reference node-side daemon for the Nexinus Terminus sovereign control plane.

Single static Go binary. Owns kernel WireGuard, SOCKS5 egress, and a recursive
`.xinus` DNS zone. Implements `ARCHANGEL/v0` enrollment and serves a
signed `/status` payload the control plane probes.

This binary is not built by Lovable. It is the artifact you `scp` to each of
your nodes (Tesseract-A, Valkyrie, KetherGate, …).

## Layout

```
node-daemon/
  cmd/archangel/main.go     entry point, HTTPS listener, route table
  internal/handshake/        ARCHANGEL/v0 challenge + enroll + allowlist
  internal/wg/               wgctrl-go peer add/remove, key load
  internal/status/           signed /status payload
  internal/socks/            sing-box supervision (exec, not in-process)
  internal/dns/              CoreDNS supervision + zone writer
  config/Corefile            CoreDNS config (.xinus zone + upstream)
  config/sing-box.json       SOCKS5 inbound bound to wg0
  systemd/archangel.service unit file
  Makefile                   build + install targets
  go.mod / go.sum            (you `go mod tidy` once)
```

## First boot

```bash
sudo make install        # builds, installs to /usr/local/bin, enables systemd
sudo archangel init     # generates server.ed25519 + server.x25519 in /etc/archangel
sudo archangel pubkeys  # prints the two pubkeys — paste into /gateway
```

Then add your operator ed25519 pubkey to `/etc/archangel/allowlist.json`:

```json
{ "operators": ["<your operator ed25519 hex from /gateway>"] }
```

`systemctl reload archangel` (SIGHUP) reloads the allowlist without
dropping peers.

## Contract

Both directions match `src/lib/sovereign-keys.ts` and `src/lib/probe-signed.ts`
in this repo. Any conforming implementation in any language is a valid node.

### Enrollment

```
GET  /archangel/challenge           → { nonce, exp, srv_pub }
POST /archangel/enroll              → { assigned_ip, server_x25519_pub, server_endpoint, dns, cidv1_receipt }
```

`sig_ed25519` is verified over the exact bytes:
`"ARCHANGEL/v0\n" + nonce + "\n" + client_x25519_pub_hex`

### Status (probed by control plane)

```
GET /status → {
  ts, wg: {iface, peers, last_handshake_max_age_s},
  socks5: {listen, active_conns},
  dns: {zone, records},
  sig_ed25519
}
```

Canonical payload for the signature is the JSON object **without**
`sig_ed25519`, with keys serialized in lexicographic order, no whitespace.
The control plane verifies with the node's pinned ed25519 pubkey before
flipping the card to MEASURED.

## Security boundary

- The daemon runs as a dedicated `archangel` user under systemd with
  `CapabilityBoundingSet=CAP_NET_ADMIN` only. No root after start.
- TLS is terminated by the daemon (autocert) — no reverse proxy required,
  no third-party load balancer in the trust path.
- Allowlist is file-based; rotation is `vi` + SIGHUP.
- Logs are stderr → journald, with no remote sink.

## Why Go

Single static binary, `wgctrl-go` is in-tree-quality, `crypto/ed25519` is
stdlib, cross-compile to `linux/amd64` and `linux/arm64` from any machine.
