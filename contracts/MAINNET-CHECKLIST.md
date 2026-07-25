# TRS / TruthCoin — Mainnet Readiness Checklist

Status: **NOT AUTHORIZED FOR MAINNET.** No mainnet address exists. The only
deployed contract is Base Sepolia testnet
`0x85b1C3c32B4Da3203b3B3c3B670Cb90e67410b78`.

This file is the gate. Every box must be checked by a human with evidence
before any mainnet `deploy` command is run.

## 0 · What TRS is (and is not)

- TRS is a **soulbound record of attestation**, not a tradeable asset.
- Minting is `onlyOwner` and manual. There is **no** code path that mints on a
  score, a probe result, a cron tick, or an "alignment" metric — and none will
  be added. Attestation is what Bitcoin's OTS receipts prove; the token merely
  records an operator's acknowledgement of an already-anchored fact.
- No price, no liquidity, no market claim is made anywhere in this repo.

## 1 · Audit findings (resolved in-repo)

| # | Finding | Resolution | Sovereignty impact |
|---|---------|-----------|--------------------|
| A1 | `owner` was permanent — no way to hand off to a multisig, so the contract could never decentralize. | Added two-step `transferOwnership` / `acceptOwnership`. | Removes the permanent single point of control. |
| A2 | A one-step handoff can burn ownership on a typo'd address. | Nominee must call `acceptOwnership()`, proving it can sign. | Prevents accidental irreversible capture/loss. |
| A3 | Constructor emitted no ownership event — off-chain indexers could not reconstruct control history. | `OwnershipTransferred(0x0, deployer)` emitted in constructor. | Control history is publicly auditable. |
| A4 | No automated proof that soulbound-ness and owner-gating actually hold. | `npm run preflight` asserts both and exits non-zero on failure. | Claims in the UI are machine-verified, not asserted. |

Open, **unresolved** items (these block mainnet):

- [ ] **No independent third-party security audit has been performed.** Self-review is not an audit.
- [ ] No legal/securities review.
- [ ] Multisig not yet created; no signer set defined.

## 2 · Pre-deploy gate

- [ ] `npm run compile` clean.
- [ ] `npm run test` all passing.
- [ ] `npm run preflight` exits 0 (asserts manifesto hash, `transfersEnabled == false`, `totalSupply == 0`, transfer reverts, mint is owner-only, two-step handoff works).
- [ ] Manifesto hash in the compiled bytecode equals
      `0x4edab582bd0eb5a72ad58df4fe677d2af685e254539b9e72c78ebc95f5ef70f7`
      — the same SHA-256 anchored at **BTC block 954181**. Any mismatch = halt.
- [ ] Multisig deployed (Safe on Base), signers recorded, threshold ≥ 2-of-3, each signer key held on separate hardware.
- [ ] Deployer key is fresh, single-purpose, and funded with only deploy gas.

## 3 · Deploy ceremony (manual, operator-signed — never automated)

1. Deploy from the fresh key. Record address + tx hash.
2. `readout` — confirm `totalSupply == 0`, `transfersEnabled == false`, `MANIFESTO_HASH` matches.
3. Verify source on Basescan.
4. `transferOwnership(<multisig>)` from the deployer.
5. From the **multisig**, execute `acceptOwnership()`. Confirm `owner == multisig` and `pendingOwner == 0x0`.
6. Confirm the old deployer key can no longer mint.
7. SHA-256 the deploy record, stamp it with OpenTimestamps, and add the receipt to `src/data/known-anchors.ts` once a real block height returns.

## 4 · Post-deploy invariants

- `transfersEnabled` stays `false`. Flipping it is one-way and is **not** an
  operator decision — it requires a published, hash-anchored governance
  decision executed by the multisig.
- Only after 4 is a mainnet address pinned in `src/data/truth-coin-contract.ts`.

## 5 · Governance vectors (mapped, not deployed)

No DAO contract exists today. The vectors a future one would own:

| Vector | Today | Future owner |
|--------|-------|--------------|
| `enableTransfers()` | `onlyOwner`, unused | Multisig → DAO vote |
| `issueDignityCredit()` | `onlyOwner`, manual | DAO-ratified attestation list |
| `transferOwnership()` | `onlyOwner`, two-step | DAO timelock |
| Node set / pinned pubkeys | source-controlled | on-chain registry (unbuilt) |

Nothing here is implemented as code. Listing it is a plan, not a claim.

## 6 · External dependency intake

Two blockers cannot be cleared from inside this repo. The internal framework is
now built to *receive* them; the fields below stay empty until real evidence
exists. `src/data/trc-governance.ts` is the machine-readable mirror of this
section, and `mainnetGateOpen()` there returns `false` while anything is blank.

### 6.1 Safe (multisig) on Base — **NOT CREATED**

Paste values here and into `TRC_SAFE` in `src/data/trc-governance.ts`:

| Field | Value | Where it comes from |
|-------|-------|---------------------|
| Safe address | _(empty)_ | Safe UI, after creation on Base (chainId 8453) |
| Chain | Base (8453) | fixed |
| Signer 1 | _(empty)_ | hardware key #1 |
| Signer 2 | _(empty)_ | hardware key #2 |
| Signer 3 | _(empty)_ | hardware key #3 |
| Threshold | _(empty)_ | must be ≥ 2-of-3 |
| Created (UTC) | _(empty)_ | Safe deployment tx timestamp |
| Deploy tx hash | _(empty)_ | Basescan — this is the evidence |

Rules:

- [ ] Each signer key lives on separate hardware, held by a distinct person or location.
- [ ] Threshold ≥ 2-of-3. A 1-of-N Safe is a single point of control wearing a multisig costume — it does not clear this gate.
- [ ] Signer set recorded from the **deployed Safe's on-chain `getOwners()`**, not from what was typed into a form.
- [ ] The Safe has executed at least one trivial test transaction before it is trusted with ownership.

Once the address is real:

```bash
cd contracts
npm run safe:transfer -- --safe 0x<your-safe>
```

That prints unsigned `transferOwnership(address)` and `acceptOwnership()`
calldata plus the verification steps. It broadcasts nothing and never touches a
key. With no Safe address it halts — it will not substitute an example address.

### 6.2 Independent third-party audit — **NOT COMMISSIONED**

Bundle under engagement (stamped, do not modify):
`8f21bb6e58e67ef925170b39b66d9bb78c2f416553919a0c57b8cb7509809a30`
Transmittal + scope letter: `/mnt/documents/AUDIT-TRANSMITTAL.md`

| Field | Value |
|-------|-------|
| Firm | _(empty)_ |
| Report date | _(empty)_ |
| Report URL | _(empty)_ |
| Report SHA-256 | _(empty)_ |
| Audited source SHA-256 | _(empty — expected `8f21bb6e…09a30`)_ |
| Remediation commit | _(empty)_ |
| Remediation bundle SHA-256 | _(empty — only if fixes were required)_ |


Mirror into `TRC_AUDIT` in `src/data/trc-governance.ts`.

Generate the package to send:

```bash
cd contracts
npm run audit:bundle
# -> /mnt/documents/truthcoin-audit-bundle.txt
```

The bundle contains `TruthCoin.sol`, the full test suite, `preflight.js`,
`deploy.js`, `prepare-safe-transfer.js`, the Hardhat config, and this
checklist — each with a per-file SHA-256 and a bundle-level SHA-256 at the
foot, plus an explicit scope / out-of-scope statement.

- [ ] `ots stamp truthcoin-audit-bundle.txt` **before** sending, so the exact
      bytes handed to the auditor are timestamped. Record the receipt in
      `src/data/known-anchors.ts` once a real block height returns.
- [ ] Auditor confirms in writing that the bundle SHA-256 they reviewed matches
      the stamped one.
- [ ] Self-review does not count. A tool run (Slither/Mythril) alone does not
      count. The firm must be independent of this project.

### 6.3 Gate

Mainnet deploy is authorized only when **6.1 and 6.2 are both fully populated
with verifiable evidence** and every box in §1–§2 is checked. Until then
`mainnetGateOpen()` returns `false`, no mainnet address is pinned anywhere, and
the UI states plainly that TRS is testnet-only.

