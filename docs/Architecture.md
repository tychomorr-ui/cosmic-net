---
title: Architecture
---

# Architecture

NEXINUS is a **verification console**, not an application backed by a database
of record. Every screen either proves something deterministically in the
browser or admits it cannot.

## Trust model in one sentence

The browser recomputes what a node claims; a claim is only "live" when the
locally derived state and the node-signed state agree under a live TLS
heartbeat — the **Coupling Condition**.

## Layers

```
┌──────────────────────────────────────────────────────────────┐
│ Presentation      src/components/**  · src/routes/**         │
│  operator dashboard, audit panels, SITREP tiles              │
├──────────────────────────────────────────────────────────────┤
│ Logic             src/lib/**                                 │
│  signed-envelope · provenance · anchors · final-manifest     │
│  probes · pipeline · taxonomy · sovereign-store              │
├──────────────────────────────────────────────────────────────┤
│ Server            src/utils/*.functions.ts · src/routes/api  │
│  typed RPC (createServerFn) · webhooks · reprobe hook · MCP  │
├──────────────────────────────────────────────────────────────┤
│ Substrate         node-daemon/ · packages/protocol           │
│  ARCHANGEL/v0 wire contract · Go daemon · signed /status     │
├──────────────────────────────────────────────────────────────┤
│ Anchors           Bitcoin via OpenTimestamps · IPFS · Base   │
└──────────────────────────────────────────────────────────────┘
```

## Major modules

| Module | File | Responsibility |
| --- | --- | --- |
| Truth Mirror (verifier) | `src/lib/signed-envelope.ts` | The single authoritative ARCHANGEL/v0 verifier: canonicalization, CID re-derivation, Ed25519 verify, TTL and skew. Everything else calls into it. |
| Probes | `src/lib/probes.ts`, `probe-signed.ts`, `probe-ipfs.ts` | Reach nodes over HTTPS, fall back to IPFS multiaddr, classify state. |
| Probe store | `src/lib/probe-store.ts` | In-memory sliding window feeding the live ticker. |
| Provenance | `src/lib/provenance.ts`, `provenance-bundle.ts`, `receipt-bundle.ts` | Receipts, shareable bundles, verification views. |
| Anchors | `src/lib/anchors.ts`, `src/data/known-anchors.ts` | OpenTimestamps receipts and Bitcoin block confirmations. |
| Golden Truth manifest | `src/lib/final-manifest.ts`, `scripts/build-manifest.mjs` | Deterministic CIDv1 aggregation over all anchored receipts. |
| Truth Substrate | `scripts/substrate-snapshot.mjs` | Deterministic root over the files that define protocol behaviour. |
| Digital Ore | `src/lib/ore.ts` | Digital Ore Unit accounting. |
| PAM | `src/lib/pam.ts` | In-browser reflective-intelligence runtime (WebGPU, no egress). |
| Truth Coin | `contracts/src/TruthCoin.sol`, `src/data/truth-coin-contract.ts` | Soulbound ERC-20 on Base, read live on-chain. |
| MCP surface | `src/lib/mcp/**` | Subscription-gated read tools plus paid provenance stamping. |
| Persistence | `src/lib/sovereign-store.ts` | Synchronous localStorage reads, write-through IndexedDB mirror. No backend round-trip. |

## Data flow — a single node verification

1. `probes.ts` fetches `https://<node>/status` and keeps the **raw bytes**.
2. `signed-envelope.ts` canonicalizes, derives the CID, and verifies the Ed25519
   signature over those raw bytes — before any `JSON.parse` is trusted.
3. TTL (≤120s) and future-skew (≤30s) are enforced.
4. On any failure, including a thrown exception, the node resolves to
   `UNVERIFIED`. There is no path from an error to a green state.
5. Verified results populate the dashboard, SITREP, and ticker.
6. `/api/public/hooks/reprobe` performs the identical check server-side on a
   15-minute `pg_cron` schedule, writing history rows that are derived data only.

## Determinism guarantees

- `canonical()` sorts keys, rejects non-finite numbers, and refuses values it
  cannot canonicalize.
- Manifest and substrate roots are reproducible from a clean checkout.
- Client state is local-first; nothing silently overwrites a witnessed value.

## Non-goals

No consensus layer, no ZK circuits, no self-destruct mechanics, no managed
relays. A six-node mesh with signed status and Bitcoin anchoring does not need
them, and claiming them would be theater.
