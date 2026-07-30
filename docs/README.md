# Documentation Index

Start here if you are an auditor, contributor, or partner. Five minutes of
reading in this order should be enough to orient.

## Read in this order

| # | Document | Answers |
| --- | --- | --- |
| 1 | [`Architecture.md`](./Architecture.md) | What the system is, its layers, and how a single verification flows end to end. |
| 2 | [`SecurityModel.md`](./SecurityModel.md) | Why each control exists, the threat model, and the accepted residual risks. |
| 3 | [`AuditScope.md`](./AuditScope.md) | Exactly what is in and out of scope, and how to reproduce the audit bundle. |
| 4 | [`TruthSubstrate.md`](./TruthSubstrate.md) | The deterministic core, the Coupling Condition, and the Golden Truth manifest. |
| 5 | [`TruthCoin.md`](./TruthCoin.md) | The soulbound contract, ownership handoff, and mainnet gate. |
| 6 | [`API.md`](./API.md) | Server functions, public HTTP routes, and the MCP tool surface. |
| 7 | [`Deployment.md`](./Deployment.md) | Web build, IPFS deploy, node bootstrap, contract ceremony. |
| 8 | [`Governance.md`](./Governance.md) | Who can change what, and how a third party verifies the rules were followed. |
| 9 | [`Roadmap.md`](./Roadmap.md) | What is done, what is blocked on external parties, what is planned. |

## Audit packet

| File | Purpose |
| --- | --- |
| [`AUDIT-TRANSMITTAL.md`](./AUDIT-TRANSMITTAL.md) | Cover letter and packet manifest for the reviewing firm. |
| `truthcoin-audit-bundle.txt` | Frozen contract audit bundle. SHA-256 `8f21bb6e…09a30`. |
| `truthcoin-audit-bundle.ots` | OpenTimestamps receipt. Anchored at Bitcoin block **959472**. |

Verify without trusting us:

```bash
sha256sum docs/truthcoin-audit-bundle.txt
ots verify docs/truthcoin-audit-bundle.ots
```

The bundle is immutable. Corrections are issued as companion documents, never as
edits — see [`Governance.md`](./Governance.md).

## Policy documents at the repository root

- [`../SECURITY.md`](../SECURITY.md) — disclosure policy, scope, key handling.
- [`../CONTRIBUTING.md`](../CONTRIBUTING.md) — ground rules and placement rules.
- [`../POLICY-OF-INTENT.md`](../POLICY-OF-INTENT.md) — protocol layers and the
  requirements that govern substrate changes.
- [`../contracts/MAINNET-CHECKLIST.md`](../contracts/MAINNET-CHECKLIST.md) — the
  gate on mainnet deployment.

## Status

**Independent security audit: pending.** No certification is claimed anywhere in
this repository or in the UI.
