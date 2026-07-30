# Security Policy

NEXINUS / cMAP is a sovereign verification platform. Its security posture is
deliberately narrow: the browser is a **verifier**, never an authority, and no
component is trusted because of who hosts it.

## Responsible disclosure

Report vulnerabilities privately to **security@universaltruth.life**
(operator: Tyler Morris, Nexinus RI Systems LLC).

- Include: affected component, reproduction steps, impact, and any PoC.
- Do **not** open a public issue for an exploitable finding.
- Expected acknowledgement: 72 hours. Expected triage: 7 days.
- Please do not run destructive tests against live mesh nodes; use a local
  node built from `node-daemon/`.

## Scope

In scope:

- `src/lib/signed-envelope.ts` — the single authoritative ARCHANGEL/v0 verifier
  (canonicalization, CID re-derivation, Ed25519 check, TTL/skew).
- `src/routes/api/public/hooks/reprobe.ts` — the server-side probe hook.
- `src/lib/mcp/**` — subscription-gated MCP tool surface.
- `contracts/src/TruthCoin.sol` — soulbound ERC-20, ownership handoff.
- Provenance / anchor logic: `src/lib/provenance*.ts`, `src/lib/anchors.ts`,
  `src/lib/final-manifest.ts`.

Out of scope:

- Third-party infrastructure (Bitcoin, OpenTimestamps calendars, IPFS gateways).
- Cosmetic UI issues, missing rate limits on public read endpoints, and
  self-inflicted client-side state edits.

## Threat model

| Adversary | Capability | Mitigation |
| --- | --- | --- |
| Hostile node operator | Serves arbitrary `/status` payloads | Payload must carry a valid Ed25519 signature over canonical bytes, and the recomputed CID must match. Failure ⇒ `UNVERIFIED`. |
| Network MITM | Rewrites responses in transit | Signature is computed over raw response bytes before `JSON.parse`; TLS is defence in depth, not the trust root. |
| Replay attacker | Re-serves a stale signed payload | TTL ≤120s in-browser, +30s max future skew, per-node counter monotonicity server-side. |
| Malicious host / CDN | Ships modified frontend | Build output is content-addressed and IPFS-pinnable; manifest CIDs are anchored to Bitcoin via OpenTimestamps. |
| Compromised database | Rewrites probe history | Probe rows are derived data only; the mesh's truth is the signed payload and its anchor, never the row. |

## Assumptions

1. Ed25519 and SHA-256 are unbroken.
2. Node private keys are generated on the node and never transmitted.
3. Bitcoin block inclusion is a proof of *existence at a time*, not of
   correctness of content.
4. A green verification state means "this payload verified in this browser at
   this moment" — nothing more.

## Ownership model

- `TruthCoin` (Base) is deployed with two-step ownership transfer.
- Production ownership target is a **2-of-3 Safe multisig on Base**.
- A **48h time-lock is declared** (`src/data/trc-governance.ts`, `TRC_TIMELOCK`)
  and is documented as *declared, not enforced* until a Safe module enforces it.
  We do not claim enforcement we do not have.

## Deployment verification

Every release should be verifiable without trusting us:

1. `node scripts/substrate-snapshot.mjs` — recompute the substrate root over
   the files that define protocol behaviour.
2. `node scripts/build-manifest.mjs` — recompute the Golden Truth manifest CID.
3. Compare the CID against the anchored value shown at `/ledger` and against
   the OpenTimestamps receipt in `docs/`.
4. `cd contracts && npm run preflight` — contract invariants must return 8/8.

## Key and secret handling

- No private keys exist in this repository. CI and local scans must stay clean.
- Runtime secrets live in the platform secret store and are read **inside**
  server function handlers (`process.env.X`), never at module scope, never in
  client code.
- Browser-visible configuration uses `VITE_*` and is treated as public.
- Webhook secrets are write-only through the Data API: `SELECT`/`UPDATE` on the
  `secret` column is revoked from `authenticated`; only `service_role` reads it.
- See `template.env` for every variable and its classification.

## Dependency policy

- Runtime dependencies are pinned by lockfile and reviewed on upgrade.
- No dependency may introduce silent network egress. Telemetry is off by default.
- Cryptography comes from `@noble/*` only. No hand-rolled primitives.
- Native/Node-only packages are rejected: the server runtime is a Worker.

## Audit status

**Independent security audit: pending.** No certification is implied anywhere in
this repository or UI. See `docs/AuditScope.md` and `docs/AUDIT-TRANSMITTAL.md`.
