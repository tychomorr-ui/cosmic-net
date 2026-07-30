---
title: Governance
---

# Governance

Governance here means: who can change what, and how a third party can check
that the rules were followed.

## Layers

| Layer | Artifact | Change requires |
| --- | --- | --- |
| Intent | `POLICY-OF-INTENT.md` | Explicit written amendment; the amendment itself is anchored. |
| Substrate | files hashed by `scripts/substrate-snapshot.mjs` | Recomputed root, stated in the PR. |
| Protocol wire | `packages/protocol/` (ARCHANGEL/v0) | Frozen. A breaking change is a new version, never an edit in place. |
| Provenance record | `src/data/terminus-ops.json`, `known-anchors.ts` | Append-only. Existing anchored entries are never rewritten. |
| Contract | `contracts/src/TruthCoin.sol` | Preflight, audit, Safe-executed handoff. |
| Frontend | everything else | Normal review under `CONTRIBUTING.md`. |

## Append-only provenance

An anchored receipt is immutable. When a document changes, a **new** hash is
stamped and both are retained. This is why an earlier request to append a link
to an already-stamped audit bundle was refused: appending would have invalidated
the existing Bitcoin anchor. A companion document
(`docs/AUDIT-TRANSMITTAL.md`) was produced instead.

## Ownership

- Operator: Tyler Morris, Nexinus RI Systems LLC (`@tychomorr`, SOV-ROOT).
- Target contract owner: 2-of-3 Safe multisig on Base — **not yet created**.
- Node identities are self-sovereign; a node is admitted to the fleet only by
  adding its pinned public key to `src/data/nodes.ts` in a reviewed change.

## Time-lock

`TRC_TIMELOCK` declares a 48-hour delay on privileged contract actions. It is
**declared, not enforced**. Enforcement requires a Safe module deployed
alongside the multisig. The distinction is stated in code, in the docs, and in
the UI. We do not claim controls we do not run.

## Amendment record

Governance amendments are themselves anchored. The Universal Justice Addendum
(SHA-256 `d9b7816a…6834`) was created rather than editing the original manifesto,
preserving both the earlier claim and the correction.

## Decision principle

When a proposal increases apparent capability but cannot be verified by an
outside party, it is rejected as theater — regardless of how good it looks in a
demo. Prior rejections on these grounds: harmonic Byzantine consensus, ZK
revenue attestation, and self-destruct mechanics.
