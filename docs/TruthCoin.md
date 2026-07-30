---
title: Truth Coin
---

# Truth Coin (TRC)

Truth Coin is the on-chain expression of verified standing in the NEXINUS Mesh.
It is **soulbound**: non-transferable by design.

## Design

| Property | Value |
| --- | --- |
| Standard | ERC-20 interface, transfers disabled (soulbound) |
| Chain | Base (testnet: Base Sepolia) |
| Testnet address | `0x85b1C3c32B4Da3203b3B3c3B670Cb90e67410b78` |
| Ownership | Two-step transfer (`transferOwnership` → `acceptOwnership`) |
| Source | `contracts/src/TruthCoin.sol` |
| On-chain readout | `src/data/truth-coin-contract.ts`, rendered on the Truth Coin view |

## Why soulbound

TRC represents standing earned by verifiable substrate contribution. Standing
that can be bought is not standing. Disabling transfer removes the market, the
speculation, and the securities posture in one line of code.

## Why two-step ownership

A single-step `transferOwnership` to a mistyped address permanently orphans the
contract. Two-step transfer requires the new owner to prove control by calling
`acceptOwnership`.

## Governance

`src/data/trc-governance.ts` holds:

- the Safe multisig target (2-of-3 on Base) — **not yet created**,
- the audit reference — **not yet commissioned**,
- `TRC_TIMELOCK`: a 48-hour delay on privileged actions, **declared, not
  enforced**, pending a Safe module that enforces it on-chain.

The UI states the declared/enforced distinction explicitly. See
`docs/Governance.md`.

## Deployment ceremony

Gated by `contracts/MAINNET-CHECKLIST.md`:

1. `npm run preflight` — 8/8 PASS, exit 0.
2. Audit report received and published.
3. Safe 2-of-3 created; address injected into `trc-governance.ts`.
4. Deploy to Base mainnet.
5. Verify source on Basescan.
6. `transferOwnership` → Safe; Safe executes `acceptOwnership`.
7. Anchor the deployment receipt via OpenTimestamps; record the block.

Steps 2 and 3 are external blockers. Until both clear, mainnet deployment does
not happen.

## What TRC is not

Not a payment token, not an investment, not liquid, not listed, not a claim on
revenue or assets. No yield, no staking, no promises.
