---
title: Roadmap
---

# Roadmap

Status vocabulary is deliberate: **DONE** means verifiable today, **BLOCKED**
means waiting on an external party, **PLANNED** means specified but not built.
Nothing is listed as done because it is nearly done.

## Now

| Item | Status |
| --- | --- |
| Unified ARCHANGEL/v0 verifier (`signed-envelope.ts`) with fail-closed semantics | DONE |
| Six-node Alpha/Beta cluster with IPFS multiaddr fallback | DONE |
| Server-side scheduled re-verification (`pg_cron` → `/api/public/hooks/reprobe`) | DONE |
| Provenance receipts, shareable bundles, `/verify` view | DONE |
| Golden Truth manifest + Bitcoin meta-anchor | DONE |
| Truth Coin on Base Sepolia, live on-chain readout | DONE |
| Subscription-gated MCP surface for agent clients | DONE |
| Audit bundle stamped and anchored (block 959472) | DONE |
| Documentation set, `SECURITY.md`, `template.env`, canonical taxonomy | DONE |

## Blocked on external parties

| Item | Blocker |
| --- | --- |
| Independent security audit | Engagement not yet commissioned (Sherlock / Cyfrin / Spearbit). |
| Safe 2-of-3 multisig on Base | Multisig not yet created by the operator. |
| Truth Coin mainnet deployment | Gated on both of the above per `contracts/MAINNET-CHECKLIST.md`. |
| Enforced 48h time-lock | Requires the Safe module; currently declared only. |

## Planned

- Historical verification timeline per node (currently a sliding in-memory window).
- Reproducible-build attestation: publish the IPFS CID of every release so the
  hosted bundle can be diffed against the pinned one.
- Auditor-facing read-only MCP tool for anchor and manifest state.
- Public golden-vector conformance suite for third-party ARCHANGEL/v0
  implementations.
- Node onboarding flow that reduces bootstrap to one reviewed pubkey commit.

## Explicitly not planned

Consensus protocols, ZK attestation of revenue, token transferability, managed
relays, and any telemetry that is on by default. Each was considered and
rejected as unverifiable, unnecessary, or contrary to the doctrine.
