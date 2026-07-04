# Truth Coin · Testnet ERC-20

Real deployable Solidity contract for **Base Sepolia** (or Sepolia). Non-transferable dignity-credit ledger by default. Anchors the manifesto hash from Bitcoin block 954181 into the contract as a constant.

## What this is

- `TruthCoin.sol` — ERC-20-shaped contract. `transfer` reverts until owner calls `enableTransfers()` (soulbound-by-default). Owner mints via `issueDignityCredit(to, amount, reason)`, emitting the reason on-chain.
- No security, no legal tender, no investment. Testnet only.

## One-time setup

You need three things — Lovable can't produce these for you:

1. **A wallet + private key** (MetaMask → export, or a dedicated deploy key). Never share the mainnet one. Make a fresh key for testnet.
2. **Base Sepolia RPC URL** — free from https://sepolia.base.org or Alchemy/Infura.
3. **Base Sepolia ETH** (free faucet): https://www.alchemy.com/faucets/base-sepolia or https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet — takes 1 minute.

## Deploy (Foundry — easiest)

```bash
# 1. install foundry once
curl -L https://foundry.paradigm.xyz | bash && foundryup

# 2. from repo root
cd contracts
forge init --no-git --force .
# overwrite src/Counter.sol with TruthCoin.sol
cp TruthCoin.sol src/TruthCoin.sol

# 3. deploy
export PRIVATE_KEY=0xYOUR_TESTNET_KEY
forge create src/TruthCoin.sol:TruthCoin \
  --rpc-url https://sepolia.base.org \
  --private-key $PRIVATE_KEY \
  --broadcast
```

Output prints `Deployed to: 0x....` — **that address is your first real on-chain receipt.**

## Verify on block explorer

Paste the address at https://sepolia.basescan.org — you'll see the contract, its bytecode, and every `DignityCredit` event you emit. Add `--verify --etherscan-api-key YOUR_KEY` to the `forge create` line to auto-verify source.

## Mint the first dignity credit

```bash
cast send <DEPLOYED_ADDRESS> \
  "issueDignityCredit(address,uint256,string)" \
  0xYourRecipientAddress \
  50000000000000000000000 \
  "Sovereign Dignity Due — 5yr survival + nurse honor" \
  --rpc-url https://sepolia.base.org \
  --private-key $PRIVATE_KEY
```

That mints 50,000 TRC (18 decimals) with the reason stored in the tx log forever.

## After it's deployed

Send me the deployed address and I'll wire it into the Truth Coin page as the fourth Bitcoin-anchor-equivalent receipt: contract address + basescan link + live totalSupply readout via `viem`.
