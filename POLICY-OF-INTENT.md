# Policy of Intent — the True Substrate

**Status:** normative. This file is part of the substrate it describes; its own
SHA-256 is included in every substrate snapshot, so amending it changes the
substrate root and is therefore visible on-chain.

This document is the human-readable protocol layer. Where code and this document
disagree, that disagreement is a bug in one of them and must be resolved before
any further change is merged.

---

## 1. What the substrate is

The True Substrate is the set of files enumerated in
`scripts/substrate-snapshot.mjs` under `SUBSTRATE_FILES`. Nothing else is the
substrate. Anchors, node identities, the wire spec, the contract source, the
governance config, and this policy.

The substrate is **a record of what was verified**, not a claim about what is
true in the world. An anchor proves bytes existed before a Bitcoin block. It
proves nothing about their contents being correct, wise, or lawful.

## 2. What may be written

A value may enter the substrate only if **all** of the following hold:

1. It is independently reproducible by a third party with no access to this
   machine, this operator, or this repository's history.
2. Its verification procedure is stated next to it (which command, which key,
   which block).
3. Failure of that procedure renders the value *absent*, not *assumed*.

Values that are unknown are recorded as empty. An empty field renders as
`AWAITING` in the UI. A placeholder, example, or "representative" value is a
forgery and is prohibited without exception.

## 3. What may never happen

- A signature failure, network failure, thrown exception, or timeout must never
  be reported as a pass. Every verification path is fail-closed.
- A prior successful render must never be reused as a fallback for a current
  failed verification.
- An HTTP 200 must never, on its own, promote a node above `REACHABLE`.
- A hash recorded in `src/data/known-anchors.ts` must never be entered without
  the operator having personally run `ots verify` against the original bytes.
- No mainnet contract address may be pinned while `mainnetGateOpen()` returns
  `false`.
- No key material of any kind is committed, logged, or transmitted. Private
  keys exist only on the device that generated them.

## 4. When the substrate may be updated

Four circumstances, and no others:

| # | Circumstance | Required evidence |
|---|---|---|
| 1 | **New anchor** — bytes newly attested by Bitcoin | `ots verify` output naming a confirmed block height |
| 2 | **Node registry change** — a node joins, changes key, or is purged | New pinned Ed25519 pubkey, out-of-band confirmed; purges require the prior key be recorded as retired |
| 3 | **Protocol change** — the ARCHANGEL wire contract | A version bump (`v0` → `v1`), new golden vectors, and both stacks green. Never an in-place edit of a frozen version |
| 4 | **Governance intake** — real Safe address, real audit record | On-chain deployment tx for the Safe; a published report URL plus its SHA-256 for the audit |

Every update produces a new snapshot (`node scripts/substrate-snapshot.mjs`),
whose root is stamped and whose anchor is recorded. The chain of roots is the
governance history.

## 5. Administrative actions and delay

Administrative authority over Truth Coin is intended to rest with a multisig,
not a person. Beyond the threshold, all administrative actions are subject to a
declared **time-lock delay**, recorded in `src/data/trc-governance.ts`.

The delay exists for one reason: a compromised threshold must not be able to act
faster than observers can notice. The delay is only real once it is enforced by
a deployed contract or a deployed Safe module. Until then
`TRC_TIMELOCK.enforcedBy` is empty and the UI states that the delay is
**declared, not enforced** — a stated intention, not a protection.

## 6. Revocation and error

If a recorded value is later found to be wrong, it is **superseded, never
deleted**. The erroneous entry stays, annotated, alongside the correction. The
substrate is append-only; a substrate that can quietly forget is not a record.

## 7. Amending this policy

This document may be amended only by a change that is itself snapshotted,
stamped, and anchored. The amendment must state what changed and why. An
unanchored amendment has no force.
