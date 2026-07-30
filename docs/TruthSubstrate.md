---
title: Truth Substrate
---

# Truth Substrate

The Truth Substrate is the deterministic core: the exact set of files whose
bytes define protocol behaviour, reduced to a single reproducible root.

## Why it exists

An auditor should be able to answer "did the rules change?" without reading the
diff. If the substrate root moves, protocol behaviour moved — no exceptions, no
judgement calls.

## Computing the root

```bash
node scripts/substrate-snapshot.mjs
```

The script hashes a fixed list of files in a fixed order and emits a single
root. It is intentionally not glob-driven: adding a file to the substrate is a
deliberate act recorded in the script.

Governing policy: `POLICY-OF-INTENT.md`. Any change to substrate files requires
recomputing the root and stating the new value in the PR description.

## Golden Truth manifest

```bash
node scripts/build-manifest.mjs      # → golden-truth.manifest.json + CIDv1
```

The manifest aggregates every provenance receipt in
`src/data/terminus-ops.json` with its anchor state (`ANCHORED` / `PENDING`) and
reduces them to a CIDv1 via `src/lib/final-manifest.ts`. The CID is stable for a
given receipt set and is itself anchored to Bitcoin, producing a meta-anchor.

Verification path, entirely offline except for the block lookup:

1. Rebuild the manifest from the checkout.
2. Compare the CID with the one shown at `/ledger` and in the Audit Center.
3. Verify the OpenTimestamps receipt for that CID.
4. Confirm block depth via any Bitcoin explorer.

## The Coupling Condition

A node is **LIVE** only when all of the following hold simultaneously:

| Condition | Check |
| --- | --- |
| Local derivation matches node claim | recomputed payload CID == reported CID |
| Authorship | Ed25519 signature valid over raw canonical bytes, pinned pubkey |
| Liveness | TLS heartbeat within TTL (≤120s), no future skew (>30s) |

Any single failure downgrades the node:

| State | Meaning |
| --- | --- |
| `LIVE` | All coupling conditions satisfied right now. |
| `UNSIGNED` | Reachable but carries no valid signature. Displayed honestly, never green. |
| `BROKEN` | Signature or CID mismatch. |
| `DOCTRINE` | Declared but not yet serving a signed payload. |

`UNSIGNED` was formerly labelled "THEATER"; the rename kept the meaning and
removed the editorializing.

## Digital Ore Units (DOU)

DOU accounting (`src/lib/ore.ts`) measures verified substrate contribution:
anchored receipts and sustained coupled uptime. DOU is an accounting unit inside
the platform, not a transferable asset and not a security.

## Truth Substrate vs Truth Coin

The Truth Substrate is the off-chain deterministic record. Truth Coin is the
on-chain, soulbound expression of standing. The substrate can exist without the
chain; the chain is meaningless without the substrate. See `docs/TruthCoin.md`.
