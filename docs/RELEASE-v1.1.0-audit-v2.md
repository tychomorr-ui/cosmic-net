# NEXINUS Audit Candidate v1.1.0 — Companion Bundle v2

Tag: `v1.1.0-audit-v2`

Additive release. The v1.0.0 audit candidate is **unchanged and still in scope**.
This release adds the hardened additive contract set and its independently
stamped bundle.

## Identity of this candidate

| Artifact | Value |
| --- | --- |
| Bundle v2 SHA-256 | `cdd91224da75142d092ea418db4aa045be59b3f74c225313899557603f0db2f5` |
| Bundle v2 OTS anchor | `docs/truthcoin-audit-bundle-v2.ots` (Bitcoin, pending block pin) |
| Bundle v1 SHA-256 | `8f21bb6e58e67ef925170b39b66d9bb78c2f416553919a0c57b8cb7509809a30` |
| Bundle v1 OTS anchor | Bitcoin block **959472** |
| Substrate root | `cc88caae…d682c` |
| Contract tests | 56/56 pass |
| Contract preflight | PASS |

## What is new in v2

- `contracts/src/SovereignOwnable.sol` — two-step ownership, no renounce path
- `contracts/src/MultiSigGoverned.sol` — real M-of-N threshold governance
- `contracts/src/DigitalOre.sol` — rewritten on the above primitives; rate-limit
  units corrected; pagination added
- `contracts/src/KetherGateRegistry.sol` — ASCII normalization blocks homoglyph
  registration attacks
- `contracts/test/HardenedContracts.test.js` — 56-test regression suite
- `contracts/scripts/deploy-blades.js` — deployment for the additive set
- `contracts/scripts/audit-bundle-v2.js` — reproducible bundle generator

## Verify without trusting us

```bash
# 1. Reproduce the bundle and compare the digest
cd contracts && node scripts/audit-bundle-v2.js
sha256sum ../docs/truthcoin-audit-bundle-v2.txt
# expect cdd91224da75142d092ea418db4aa045be59b3f74c225313899557603f0db2f5

# 2. Confirm the Bitcoin anchor
ots upgrade docs/truthcoin-audit-bundle-v2.ots
ots verify docs/truthcoin-audit-bundle-v2.ots

# 3. Run the suite and preflight
cd contracts && npm ci && npm test && npm run preflight

# 4. Re-derive the substrate root
node scripts/substrate-snapshot.mjs
```

## Scope for reviewers

See [`AUDIT-TRANSMITTAL-v2.md`](./AUDIT-TRANSMITTAL-v2.md) for the six
invariants under review and [`AuditScope.md`](./AuditScope.md) for the full
in-scope/out-of-scope boundary.

## Release assets to attach

- `truthcoin-audit-bundle-v2.txt`
- `truthcoin-audit-bundle-v2.ots`
- `AUDIT-TRANSMITTAL-v2.md`
- `SHERLOCK-CHECKLIST.md`

**Independent security audit: pending.** No certification is claimed.
