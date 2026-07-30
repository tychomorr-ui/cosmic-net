# NEXINUS Audit Candidate v1.0.0

Tag: `v1.0.0-audit`

This release represents the frozen audit candidate submitted for independent
security review.

## Contents

- Documentation (`docs/`)
- Audit bundle — `docs/truthcoin-audit-bundle.txt`
- OpenTimestamps receipt — `docs/truthcoin-audit-bundle.ots`
- Architecture — `docs/Architecture.md`
- Security model — `docs/SecurityModel.md`
- Governance — `docs/Governance.md`
- Truth Coin — `docs/TruthCoin.md`
- Truth Substrate — `docs/TruthSubstrate.md`
- Verification artifacts — `scripts/substrate-snapshot.mjs`, `scripts/build-manifest.mjs`,
  `contracts/scripts/preflight.js`

## Identity of this candidate

| Artifact | Value |
| --- | --- |
| Audit bundle SHA-256 | `8f21bb6e…09a30` |
| Bitcoin OTS anchor | block **959472** |
| Substrate root | `cc88caae…d682c` |
| Contract preflight | PASS (8/8) |

## Verify without trusting us

```bash
sha256sum docs/truthcoin-audit-bundle.txt
ots verify docs/truthcoin-audit-bundle.ots
node scripts/substrate-snapshot.mjs
cd contracts && npm run preflight
```

## Freeze policy

No additional functionality will be introduced until the audit process is
complete. Subsequent releases will address findings from the audit. Corrections
to the frozen bundle are issued as companion documents, never as edits — see
[`Governance.md`](./Governance.md).

**Independent security audit: pending.** No certification is claimed.

## Release assets to attach

- `truthcoin-audit-bundle.txt`
- `truthcoin-audit-bundle.ots`
- `AUDIT-TRANSMITTAL.md` (optional)
