# TruthCoin (TRS) — Audit Transmittal

**Do not modify `truthcoin-audit-bundle.txt`. Not one byte.**
The OpenTimestamps receipt below attests to that exact file. Any edit —
whitespace, line ending, an appended note — breaks the proof and voids the
scope of this engagement.

## 1 · Artifacts

| File | Purpose |
|------|---------|
| `truthcoin-audit-bundle.txt` | The complete audit scope: contract, tests, scripts, config, checklist |
| `truthcoin-audit-bundle.ots` | OpenTimestamps receipt for the bundle above |

## 2 · Bundle identity

```
SHA-256 : 8f21bb6e58e67ef925170b39b66d9bb78c2f416553919a0c57b8cb7509809a30
Bytes   : 32437
OTS     : Bitcoin block 959472
```

The bundle also carries a `BUNDLE SHA256` line at its foot, computed over
everything above that line, plus a per-file SHA-256 index in its header. Both
are internal integrity checks; the file-level hash above is the contractual
identifier for this engagement.

## 3 · Verification (auditor performs BEFORE reading any code)

```bash
sha256sum truthcoin-audit-bundle.txt
# must print: 8f21bb6e58e67ef925170b39b66d9bb78c2f416553919a0c57b8cb7509809a30

ots verify truthcoin-audit-bundle.ots
# must report a Bitcoin block attestation for the same file
```

If either check fails, halt and contact the operator. Do not proceed on a
mismatched artifact.

Confirm in writing, in the report, that:
- the SHA-256 you computed matches the value above, and
- the OTS receipt verified against a Bitcoin block, with the block height stated.

## 4 · Scope — white-box, bundle only

Review is strictly limited to source contained in the bundle. Do not substitute
a repository checkout, a later commit, or any file not present in the bundle.

Invariants to be affirmed or refuted, each individually:

1. **Soulbound.** `transfersEnabled == false` at deploy and `transfer`,
   `transferFrom`, `approve` are unusable while it is false. No bypass path.
2. **One-way unlock.** `enableTransfers()` is owner-gated and cannot be reversed
   or re-entered to a inconsistent state.
3. **Owner-only mint.** `issueDignityCredit()` is owner-gated. Confirm there is
   **no** autonomous, metric-driven, score-driven, or scheduled mint path
   anywhere in the bundled source.
4. **Two-step ownership handoff.** `transferOwnership` / `acceptOwnership`:
   ownership cannot be burned by a typo, cannot be hijacked by a non-nominee,
   and `pendingOwner` is cleared on accept. Old owner loses mint rights.
5. **Manifesto immutability.** `MANIFESTO_HASH` is immutable and equals
   `0x4edab582bd0eb5a72ad58df4fe677d2af685e254539b9e72c78ebc95f5ef70f7`
   (SHA-256 anchored in Bitcoin block 954181).
6. **General.** Reentrancy, arithmetic, access control, event-emission gaps.

Explicitly out of scope — these do not exist: DAO/governance contract, staking,
liquidity, price oracle, bridging, upgradeability (the contract is
non-upgradeable by design). No mainnet deployment exists; the only live
deployment is Base Sepolia
`0x85b1C3c32B4Da3203b3B3c3B670Cb90e67410b78`.

## 5 · Deliverable requirements

- Report as PDF **and** Markdown, same content.
- First page states: firm name, report date, the bundle SHA-256 reviewed, the
  OTS block height observed.
- Each finding: severity, affected function, reproduction, recommended fix.
- Each invariant in §4 explicitly marked **HOLDS** or **VIOLATED** — no silent
  omissions.
- A statement of independence from this project.
- Report SHA-256 supplied by the firm, and a public URL for the report.

A tool run (Slither/Mythril) alone does not satisfy this engagement.

## 6 · On receipt — operator finalization

1. `sha256sum <report>.pdf` → record.
2. Populate `TRC_AUDIT` in `src/data/trc-governance.ts`: firm, reportDate,
   reportUrl, reportSha256, auditedSourceSha256 (= `8f21bb6e…09a30` unless a
   remediation bundle superseded it), remediation.
3. If fixes are required: apply them, run `npm run test` and `npm run preflight`,
   regenerate with `npm run audit:bundle`, stamp the new bundle, and record the
   new bundle SHA in the `Remediation commit` row of §6.2 of
   `MAINNET-CHECKLIST.md`. The old bundle hash stays on record — the trail from
   initial to hardened state must remain readable.
4. `ots stamp src/data/trc-governance.ts`, then add the SHA-256 → block height
   binding to `src/data/known-anchors.ts` once a real height returns.

`mainnetGateOpen()` returns `false` until both §6.1 (Safe) and §6.2 (audit) are
populated with verifiable evidence. It is not overridable by hand.

---

## Appendix — email template

> **Subject:** TruthCoin (TRS) — white-box audit request, fixed-scope bundle `8f21bb6e`
>
> Hello,
>
> We are requesting a white-box security audit of a soulbound ERC-20 contract
> and its deployment/ownership tooling. There is no mainnet deployment; the
> only live deployment is on Base Sepolia.
>
> Attached:
> - `truthcoin-audit-bundle.txt` — the complete scope in one file
> - `truthcoin-audit-bundle.txt.ots` — OpenTimestamps receipt
> - `AUDIT-TRANSMITTAL.md` — scope, invariants, and deliverable requirements
>
> The audit scope is fixed to the bundle whose SHA-256 is
> `8f21bb6e58e67ef925170b39b66d9bb78c2f416553919a0c57b8cb7509809a30`.
> Please verify that hash and the OTS receipt before beginning, and confirm both
> in the report. Any deviation from those exact bytes puts the work outside the
> agreed scope.
>
> The six invariants we need affirmed or refuted are listed in §4 of the
> transmittal. Please quote for that scope and share your availability.
>
> Thank you,
> [name] · [contact]
