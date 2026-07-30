---
title: Audit Scope
---

# Audit Scope

**Independent security audit: pending.** Nothing in this repository or UI claims
certification.

## Engagement targets

Candidate firms: Sherlock, Cyfrin, Spearbit.

## Primary scope — smart contract

| Item | Path |
| --- | --- |
| Truth Coin (soulbound ERC-20, two-step ownership) | `contracts/src/TruthCoin.sol` |
| Deployment + handoff scripts | `contracts/scripts/deploy.js`, `prepare-safe-transfer.js` |
| Preflight invariants (8 checks, must exit 0) | `contracts/scripts/preflight.js` |
| Tests | `contracts/test/TruthCoin.test.js` |
| Mainnet gate | `contracts/MAINNET-CHECKLIST.md` |

Deployed (testnet): Base Sepolia `0x85b1C3c32B4Da3203b3B3c3B670Cb90e67410b78`.

## Secondary scope — protocol and verification

| Item | Path | Why it matters |
| --- | --- | --- |
| ARCHANGEL/v0 verifier | `src/lib/signed-envelope.ts` | Single trust decision point for the whole platform. |
| Wire contract | `packages/protocol/` (+ golden vectors) | Frozen spec shared with the Go daemon. |
| Server probe hook | `src/routes/api/public/hooks/reprobe.ts` | Public endpoint performing the same verification server-side. |
| Payments webhook | `src/routes/api/public/payments/webhook.ts` | Signature verification before any state change. |
| MCP gating | `src/lib/mcp/subscription-gate.ts` | Entitlement enforcement for paid tools. |
| Provenance + anchors | `src/lib/provenance*.ts`, `anchors.ts`, `final-manifest.ts` | Determinism of the Golden Truth CID. |

## Out of scope

Bitcoin, OpenTimestamps calendars, IPFS gateways, Supabase/Stripe as platforms,
cosmetic UI, and the Go daemon's host OS hardening.

## Reproducing the audit bundle

```bash
sha256sum docs/truthcoin-audit-bundle.txt     # 8f21bb6e…09a30
ots verify docs/truthcoin-audit-bundle.ots    # Bitcoin block 959472
cd contracts && npm install && npm run preflight   # expect 8/8 PASS, exit 0
node scripts/substrate-snapshot.mjs           # deterministic substrate root
node scripts/build-manifest.mjs               # Golden Truth manifest CID
```

The transmittal letter and packet manifest live in `docs/AUDIT-TRANSMITTAL.md`.

## Open external blockers

1. Safe 2-of-3 multisig on Base not yet created.
2. Third-party audit not yet commissioned.

Both are tracked in `contracts/MAINNET-CHECKLIST.md` and surfaced in the UI's
Audit Center as pending.
