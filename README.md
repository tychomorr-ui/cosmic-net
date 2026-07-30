# NEXINUS — cMAP (Cosmic Mesh Alignment Protocol)

Sovereign witness console for a peer-to-peer mesh. No central capture point, no
managed relays, no silent overwrites. **The browser is a verifier and a witness
— never the source of truth.**

Live: <https://universaltruth.life>

> **Independent security audit: pending.** Nothing here claims certification.
> See [`docs/AuditScope.md`](./docs/AuditScope.md).

---

## What NEXINUS is

A verification platform. Every state it renders is either recomputed locally
from signed bytes, or shown honestly as unverified. There is no path from an
error to a green state.

A node is **LIVE** only when the **Coupling Condition** holds: the locally
derived CID matches the node-reported signed payload, verified over a live TLS
heartbeat inside a bounded freshness window. Anything less is `UNSIGNED`,
`BROKEN`, or `DOCTRINE` — and is labelled as such.

## Ecosystem overview

| Concept | What it is |
| --- | --- |
| **Truth Engine** | The verification pipeline from raw bytes to operator-actionable state. |
| **Truth Mirror** | Independent local re-derivation of any claim a node makes. |
| **Truth Substrate** | The deterministic file set defining protocol behaviour, reduced to one reproducible root. |
| **Digital Ore Units (DOU)** | Accounting unit for verified substrate contribution. Not transferable. |
| **Archangel Guardian Layer** | Node daemon + frozen ARCHANGEL/v0 wire contract serving Ed25519-signed status. |
| **SITREP** | Live operational situation report across the fleet. |
| **PAM Reflective Intelligence** | In-browser WebGPU runtime. No packets leave during inference. |
| **Monarch OS** | The sovereign operator node profile. |
| **NEXINUS Mesh** | The peer-to-peer fabric cMAP aligns. Mesh, never "net". |
| **Truth Coin (TRC)** | Soulbound ERC-20 on Base expressing verified standing. |

Canonical spellings are enforced from [`src/lib/taxonomy.ts`](./src/lib/taxonomy.ts).

## Doctrine (non-negotiable)

1. Private keys are generated on the node. Only the public half leaves.
2. The verifier defaults to `UNVERIFIED` every render. Only an explicit `true`
   flips it. Any thrown exception ⇒ `UNVERIFIED`, never green.
3. Signatures are verified over the raw response bytes of the canonicalized
   payload, **before** any `JSON.parse`.
4. `counter` stays an opaque string until after verification.
5. The browser enforces a tight TTL (≤120s); the aggregator enforces per-node
   counter monotonicity.
6. Zero telemetry, local-first, signed provenance.

## Architecture

```
Presentation   src/components/**  · src/routes/**
Logic          src/lib/**           signed-envelope · provenance · anchors
Server         src/utils/*.functions.ts · src/routes/api/**
Substrate      node-daemon/ · packages/protocol   (ARCHANGEL/v0)
Anchors        Bitcoin (OpenTimestamps) · IPFS · Base
```

The single trust decision point for the entire platform is
[`src/lib/signed-envelope.ts`](./src/lib/signed-envelope.ts). Full detail:
[`docs/Architecture.md`](./docs/Architecture.md).

## Stack

- TanStack Start v1 (React 19, Vite 7); server runtime is a Cloudflare Worker.
- Tailwind v4 (`src/styles.css`) with shadcn primitives.
- `@cosmic-mesh/protocol` — frozen ARCHANGEL/v0 contract shared with the Go
  `archangel` daemon.
- Cryptography from `@noble/*` only. No hand-rolled primitives.
- `src/lib/sovereign-store.ts` — synchronous localStorage reads with a
  write-through IndexedDB mirror. Nothing round-trips to a backend.
- `src/lib/telemetry.ts` — three-mode switch, default **OFF**.

## Repository layout

```
src/
  routes/        file-based routes + api/ (public callers under api/public/)
  components/    presentation only
  lib/           business logic, crypto, derivation, verification
  data/          static registries: nodes, blades, anchors, governance
  utils/         *.functions.ts typed server RPC
  integrations/  generated backend clients (do not edit)
contracts/       TruthCoin.sol, deploy/preflight scripts, mainnet checklist
node-daemon/     Go ARCHANGEL daemon
packages/        protocol spec + golden vectors
scripts/         operator tooling: manifest, substrate snapshot, bootstrap
docs/            architecture, security, audit, governance, roadmap
public/          static assets + signed-status-server.py
```

`src/routeTree.gen.ts` is generated — never edit it.

## Getting started

```bash
bun install
cp template.env .env      # fill in what you need; never commit .env
bun run dev               # http://localhost:8080
bunx vitest run           # tests
bun run lint
```

Contracts:

```bash
cd contracts && npm install && npm run preflight   # expect 8/8 PASS, exit 0
```

## Deployment

Hosted web build, sovereign IPFS pin, mesh node bootstrap, and the contract
ceremony are each documented in [`docs/Deployment.md`](./docs/Deployment.md).

Sovereign deploy in two commands:

```bash
bun run build
node scripts/pin-ipfs.mjs      # requires Kubo `ipfs` on PATH → bafy…cid
```

## Verify this repository yourself

```bash
node scripts/substrate-snapshot.mjs      # deterministic substrate root
node scripts/build-manifest.mjs          # Golden Truth manifest CID
sha256sum docs/truthcoin-audit-bundle.txt        # 8f21bb6e…09a30
ots verify docs/truthcoin-audit-bundle.ots       # Bitcoin block 959472
```

## Documentation index

| Document | Answers |
| --- | --- |
| [Architecture](./docs/Architecture.md) | Layers, modules, verification flow. |
| [Security Model](./docs/SecurityModel.md) | Threat model, controls, residual risk. |
| [Audit Scope](./docs/AuditScope.md) | What auditors review and how to reproduce it. |
| [Truth Substrate](./docs/TruthSubstrate.md) | Determinism, Coupling Condition, manifest. |
| [Truth Coin](./docs/TruthCoin.md) | Contract design, governance, mainnet gate. |
| [API](./docs/API.md) | Server functions, public routes, MCP tools. |
| [Deployment](./docs/Deployment.md) | Web, IPFS, nodes, contracts. |
| [Governance](./docs/Governance.md) | Who can change what, and how it is checked. |
| [Roadmap](./docs/Roadmap.md) | Done, blocked, planned. |
| [Security policy](./SECURITY.md) | Disclosure, key and secret handling. |
| [Contributing](./CONTRIBUTING.md) | Ground rules, placement rules, PR standards. |
| [Policy of Intent](./POLICY-OF-INTENT.md) | Protocol layers and substrate change rules. |

## Audit status

| Item | Status |
| --- | --- |
| Contract audit bundle | Frozen, SHA-256 `8f21bb6e…09a30`, anchored at Bitcoin block 959472 |
| Independent security audit | **Pending** — not commissioned |
| Safe 2-of-3 multisig (Base) | **Pending** — not created |
| Truth Coin mainnet | **Blocked** on the two items above |
| Truth Coin Base Sepolia | Deployed — `0x85b1C3c32B4Da3203b3B3c3B670Cb90e67410b78` |
| 48h time-lock | **Declared, not enforced** — requires a Safe module |

## Contact

- Operator: Tyler Morris — Nexinus RI Systems LLC (`@tychomorr`, SOV-ROOT)
- Security disclosures: **security@universaltruth.life** (see [`SECURITY.md`](./SECURITY.md))

## License

MIT — see [`LICENSE`](./LICENSE).
