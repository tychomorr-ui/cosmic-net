# NEXINUS — Audit Transmittal v2 (companion, additive scope)

**Do not modify `truthcoin-audit-bundle-v2.txt`. Not one byte.** The
OpenTimestamps receipt attests to that exact file; any edit voids the proof and
the scope of this engagement.

This transmittal is **additive** to
[`AUDIT-TRANSMITTAL.md`](./AUDIT-TRANSMITTAL.md). Bundle v1
(`8f21bb6e…09a30`, Bitcoin block 959472) is frozen and unchanged.

## 1 · Artifacts

| File | Purpose |
|------|---------|
| `truthcoin-audit-bundle-v2.txt` | Complete v2 scope: 4 contracts, tests, deploy script, config |
| `truthcoin-audit-bundle-v2.ots` | OpenTimestamps receipt for the bundle above |

## 2 · Bundle identity

```
SHA-256 : cdd91224da75142d092ea418db4aa045be59b3f74c225313899557603f0db2f5
Bytes   : 70847
OTS     : submitted to alice / bob / finney calendars; pending Bitcoin
          block inclusion at time of writing. Run `ots upgrade` then
          `ots verify` to obtain and check the block attestation.
```

## 3 · Verification (auditor performs BEFORE reading any code)

```bash
sha256sum truthcoin-audit-bundle-v2.txt
# must print: cdd91224da75142d092ea418db4aa045be59b3f74c225313899557603f0db2f5

ots upgrade truthcoin-audit-bundle-v2.ots
ots verify  truthcoin-audit-bundle-v2.ots
```

If the SHA-256 does not match, halt and contact the operator.

## 4 · Scope — white-box, bundle only

Review is limited to source contained in the bundle. Do not substitute a
repository checkout or a later commit.

None of these contracts are deployed on any network — no testnet, no mainnet.

Invariants to be affirmed or refuted, each individually:

1. **SovereignOwnable.** Two-step `transferOwnership` / `acceptOwnership`;
   `renounceOwnership()` always reverts; `pendingOwner` cleared on accept; no
   path to burn or hijack ownership.
2. **MultiSigGoverned.** The M-of-N threshold is genuinely enforced at
   execution. Approvals cannot be double-counted; signer-set changes cannot
   strand the contract; executed or cancelled proposals cannot be replayed.
3. **DigitalOre (DOU).** `transfer` / `transferFrom` / `approve` symmetric and
   unusable while locked. Mint rate limits are denominated in **seconds** and
   are not bypassable within miner timestamp tolerance. Cursor-based dividend
   accrual cannot replay a record or double-pay; `claimDividend` has no
   reentrancy or rounding-drain path; grade math cannot truncate to zero or
   overflow.
4. **KetherGateRegistry.** ASCII name normalization makes homoglyph and
   case-variant impersonation impossible. All identity reads are paginated and
   gas-bounded. `attestClaim` records an owner **assertion** only
   (`claimedManifestHash` / `claimedBitcoinBlockHeight`) and performs no
   on-chain verification — confirm no code or naming implies otherwise.
   Conflicting re-anchors revert rather than silently overwrite.
5. **Composition.** No hazard where `MultiSigGoverned` and `SovereignOwnable`
   gate the same function.
6. **General.** Reentrancy, arithmetic, access control, event-emission gaps.

Out of scope (does not exist): DAO/token-voting governance, staking, liquidity,
price oracle, bridging, upgradeability (all contracts are non-upgradeable by
design), and everything already covered by bundle v1.

## 5 · Deliverable requirements

Identical to §5 of `AUDIT-TRANSMITTAL.md`, with the v2 bundle SHA-256 and its
OTS block height stated on the first page. Each invariant in §4 must be marked
explicitly **HOLDS** or **VIOLATED** — no silent omissions. A tool run
(Slither/Mythril) alone does not satisfy this engagement.

**Independent security audit: pending.** No certification is claimed.
