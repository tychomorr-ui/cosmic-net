
# Cosmic Mesh Alignment — Unification Plan

Synthesis of the GitHub scan (`tychomorr-ui/nexinus-bootstrap`, `nexinus-net`, `tesseract`, `sudo-coin`) into this Terminus project. The bootstrap repo already contains the production doctrine — we adopt it verbatim and stop reinventing it.

## What the scan returned

- **`nexinus-bootstrap`** — the real source of truth. Ed25519 on-node keygen (`setup.sh`), signed heartbeat with monotonic `counter` + `measured_at` inside the signed payload, systemd timer rewriting every 15s, fail-closed verifier doctrine (`VERIFIER.md`), authenticated pubkey handoff over SSH (no TOFU), Zapier second-witness probe that refuses optimistic timestamps.
- **`nexinus-net`** — Express+Drizzle+SSE platform with the canonical `state → content → done` wire format and constant-time auth on privileged modes. We reuse the SSE shape and constant-time gate, not the Express server.
- **`tesseract` / `sudo-coin`** — doctrine/manifesto material. Becomes `/doctrine` content, not code.
- **Current Terminus** — already has `node-daemon/` (Go, ARCHANGEL/v0), `src/lib/sovereign-keys.ts` (Noble curves), `src/lib/probe-signed.ts`. Roughly 60% of the target; the gaps are the shared spec, one-command enroll, and counter-aware verifier.

## Target architecture — Nx monorepo

```text
cosmic-mesh/
  apps/
    web/                 # TanStack Start — current src/ moves here
    daemon/              # Go archangel — current node-daemon/ moves here
    bootstrap/           # static install.sh + pairing-code printer
  packages/
    protocol/            # ARCHANGEL/v0 spec — single source of truth
      spec/archangel.v0.json
      ts/                # generated TS types + canonical-bytes helper
      go/                # generated Go structs + canonical-bytes helper
    crypto/              # ed25519/x25519 wrappers (TS @noble, Go crypto/ed25519)
    verifier/            # fail-closed verifier per VERIFIER.md
    ui/                  # shared shadcn primitives + terminus theme tokens
  nx.json, pnpm-workspace.yaml, go.work
  tools/codegen/         # spec → ts + go generator
```

Nx targets: `web:build`, `web:dev`, `daemon:build` (custom executor → `go build`), `protocol:codegen`, `verifier:test` (golden vectors). `nx affected` drives CI.

## Protocol — ARCHANGEL/v0

Frozen wire contract, codegenned into both stacks. No hand-written struct drift.

**Identity envelope** (`GET /archangel/identity`, unauthenticated):
```json
{ "v":"ARCHANGEL/v0", "node_id":"valkyrie", "ed_pub":"<base64>", "x_pub":"<base64>",
  "endpoint":"valkyrie.nexinus.net:51820", "issued_at":"<RFC3339>" }
```

**Signed status** (`GET /archangel/status`):
```json
{ "payload":"<exact-bytes-string>", "sig":"<base64 ed25519>", "alg":"ed25519" }
```
`payload` is a canonical JSON string (sorted keys, no whitespace) containing `{ node, status, counter, measured_at, health }`.

**Non-negotiable rules** (from `ATTESTATION.md` / `VERIFIER.md`):
1. Private key generated only on the node. Only the public half leaves.
2. `counter` and `measured_at` are inside the signed bytes — not envelope fields.
3. Verifier signs over the raw response bytes of `payload`, before any `JSON.parse`.
4. `counter` stays an opaque string until after verify (no Number precision loss).
5. Every render cycle defaults to `UNVERIFIED`; only an explicit `true` transitions out. Thrown exception ⇒ `UNVERIFIED`, never green.
6. Stateless verifier (browser) enforces tight TTL (≤120s). Aggregator (Cloud) enforces counter monotonicity per `node_id`.
7. Replay defense is split and labeled in UI — never silently downgraded.

**Pairing handshake** (`POST /archangel/pair`, one-shot, 120s window): client posts pairing code + its ed_pub; daemon constant-time compares against local `/etc/archangel/pairing`, returns identity envelope signed by node_ed; client verifies sig against the ed_pub it just received, posts enrollment to Cloud.

## One-command enrollment

```bash
curl -fsSL https://cosmic.net/install.sh | sudo bash
```
A hardened evolution of `setup.sh`:
1. Generates Ed25519 + X25519 keypairs (idempotent — never rotates if files exist).
2. Installs `archangel` binary + systemd unit + 15s signed-heartbeat timer.
3. Generates a 6-word BIP39 pairing code (~66 bits, single-use, 120s TTL), printed once + rendered as QR in TTY.
4. Operator pastes code (or scans QR) into `/gateway`. Browser hits `/archangel/pair`, verifies signature, posts enrollment to Cloud.
5. Cloud stores `{node_id, ed_pub, x_pub, endpoint, enrolled_at, enrolled_by}` with RLS scoped to the operator.

No pubkey paste. No TOFU on the pairing call — the code itself is the out-of-band secret, exactly as `ATTESTATION.md` requires.

## Truth Chain (re-currency)

The chain is the per-node monotonic counter sequence, append-only in Cloud: `{node_id, counter, payload, sig, received_at, prev_counter_hash}`. A gap or non-monotonic counter is a hard red fault, not silently smoothed. State continuity *is* the asset; no token, no balance.

## UX — native networking dashboard

Single Terminus shell. Routes collapse to:
- `/` — fleet overview: live map, per-node UNVERIFIED→VERIFIED state machine, counter ribbon.
- `/node/$id` — inspector: latest signed payload (raw-bytes view), counter sparkline, replay-defense badge (`tight-TTL` vs `counter-monotonic`).
- `/gateway` — single field: pairing code. Whole enrollment UI.
- `/doctrine` — `ATTESTATION.md` + `VERIFIER.md` rendered, with the guarantee-boundary table.
- `/proof` — drop `{payload, sig, ed_pub}`, get fail-closed verification in-browser.

Existing route sprawl (`/observatory`, `/ooda`, `/reclaim`, `/ops`, `/fleet`, `/forge`, `/ore`, etc.) consolidates into `/` tabs or moves to `/lab` behind a flag. That sprawl is the "patchwork" — we cut it.

## Iterative milestones

**M1 — Protocol extraction (zero behavior change).** Create `packages/protocol/spec/archangel.v0.json`. Generate TS + Go. Replace hand-written types in `src/lib/probe-signed.ts` and `node-daemon/internal/status/`. Golden test vectors in `packages/verifier`.

**M2 — Fail-closed verifier.** Rewrite browser verifier per `VERIFIER.md` 2A/2B/2C: raw-bytes verify, opaque counter, default-UNVERIFIED render. SPKI import test vector must pass on boot or the app refuses to render fleet data.

**M3 — Daemon hardening.** Daemon emits canonical-JSON payload, signs with on-disk ed25519 key, includes `counter` + `measured_at` inside signed bytes. Persist counter to `/etc/archangel/counter`. Add `/archangel/identity`.

**M4 — One-command enrollment.** `apps/bootstrap/install.sh` + pairing-code flow. `/gateway` reduced to one input. Cloud table `enrollments` with RLS + GRANTs in same migration.

**M5 — Aggregator + counter monotonicity.** TanStack server function pulls `/archangel/status` every 15s, stores rows, flags gaps/regressions. `/node/$id` shows counter ribbon + replay-defense badge.

**M6 — Nx monorepo cutover.** Move `src/` → `apps/web/`, `node-daemon/` → `apps/daemon/`. Wire `go.work`, Nx custom executor for Go, `nx affected` CI. Delete duplicate types.

**M7 — UX consolidation.** Collapse routes to the 5 above. Move legacy blades to `/lab`. Render `/doctrine` from the same Markdown files the bootstrap repo ships.

## Out of scope

- No SUDO-COIN tokenomics, no Bitcoin anchoring — re-currency is the counter chain.
- No replacement of WireGuard; daemon manages keys, OS handles traffic.
- No port of `nexinus-net`'s Express server — we keep TanStack Start.
- No automatic key rotation in M1–M7 — rotation stays a deliberate, separate act per `ATTESTATION.md`.

## Technical notes

- Codegen: `quicktype` for TS, `text/template` for Go, both consume `spec/archangel.v0.json`. CI fails if generated files drift.
- Canonical JSON: RFC 8785 (JCS). TS and Go implementations must produce byte-identical output — enforced by golden vectors.
- Pairing code: 6 BIP39 words, single-use, 120s TTL, constant-time compare on daemon.
- Cloud schema (M5): `nodes`, `attestations`; `GRANT` + RLS in same migration; `TO anon` SELECT only on non-sensitive columns.
- Nx Go executor: thin wrapper invoking `go build ./...` in `apps/daemon/`, cache key = hashed Go files + `go.sum`.

Approve and I start at **M1** — it changes zero runtime behavior and is the prerequisite for everything else.
