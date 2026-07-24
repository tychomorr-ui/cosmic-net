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
