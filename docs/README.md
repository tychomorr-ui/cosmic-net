# Auditor documentation index

Everything an external reviewer needs, in one directory.

| File | What it is |
|------|------------|
| [`AUDIT-TRANSMITTAL.md`](./AUDIT-TRANSMITTAL.md) | Scope, invariants, deliverable requirements for the engagement |
| [`truthcoin-audit-bundle.txt`](./truthcoin-audit-bundle.txt) | The fixed audit scope: contract, tests, scripts, config, checklist in one file |
| [`truthcoin-audit-bundle.ots`](./truthcoin-audit-bundle.ots) | OpenTimestamps receipt for the bundle — Bitcoin block **959472** |
| [`../POLICY-OF-INTENT.md`](../POLICY-OF-INTENT.md) | Governance and upgrade logic; normative, itself part of the substrate |
| [`../contracts/MAINNET-CHECKLIST.md`](../contracts/MAINNET-CHECKLIST.md) | The gate conditions blocking mainnet deployment |

## Bundle identity

```
SHA-256 : 8f21bb6e58e67ef925170b39b66d9bb78c2f416553919a0c57b8cb7509809a30
Bytes   : 32437
OTS     : Bitcoin block 959472
```

Verify before reading any code:

```bash
sha256sum docs/truthcoin-audit-bundle.txt
ots verify docs/truthcoin-audit-bundle.ots
```

Do not modify `truthcoin-audit-bundle.txt`. One byte breaks the proof and voids
the scope.

## Reproducing the substrate root

```bash
node scripts/substrate-snapshot.mjs   # prints root_sha256 over the substrate file set
cd contracts && npm install && npm run preflight   # must exit 0
cd contracts && npm test
```

`npm run preflight` asserts every mainnet-readiness invariant against an
in-memory deploy. A non-zero exit means the tree is not audit-ready.

## Where the review surface lives

- `contracts/src/TruthCoin.sol` — the only contract in scope
- `contracts/scripts/` — deploy, preflight, Safe handoff, bundle generation
- `src/lib/signed-envelope.ts` + `src/lib/signed-envelope.test.ts` — hardened
  ARCHANGEL/v0 envelope verification (single verification path, fail-closed)
- `scripts/substrate-snapshot.mjs` — deterministic substrate root derivation
