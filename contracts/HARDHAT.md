# Truth Coin · Hardhat Deploy

Foundry version lives in `README.md`. This is the Hardhat path — same
contract (`TruthCoin.sol`), one command to deploy after setup.

## 0 · One-time prerequisites (Lovable can't do these for you)

1. **Node 18+** installed locally.
2. *(Optional for live testnet)* A fresh testnet wallet + private key
   (MetaMask → create new account → export private key). **Never reuse a
   mainnet key.**
3. *(Optional for live testnet)* Base Sepolia ETH. If Alchemy/Coinbase
   faucets reject you, these work without mainnet balance:
   - **Coinbase Developer Platform (CDP)** — up to 0.1 ETH/day, just a wallet
     address: https://portal.cdp.coinbase.com/products/faucet
   - **QuickNode Multi-Chain Faucet** — connect wallet, no mainnet check:
     https://faucet.quicknode.com/base/sepolia
   - **thirdweb Base Sepolia Faucet** — 0.01 ETH/day:
     https://thirdweb.com/base-sepolia-testnet
   - **ethfaucet.com** — 0.1 ETH/day: https://ethfaucet.com/

## 1 · Install & configure

```bash
cd contracts
npm install
# only needed for live testnet deploy:
cp .env.example .env
# edit .env, paste PRIVATE_KEY (0x…) and optional BASESCAN_API_KEY
```

## 2 · Prove it works locally (no wallet, no faucet, no network)

```bash
npm run compile
npm run test
npm run deploy:local
```

- `npm run test` runs 5 assertions that verify the contract compiles and its
  core rules hold.
- `npm run deploy:local` deploys to an in-memory Hardhat network using a
  built-in signer with 10,000 fake ETH. It prints the contract address and
  writes `contracts/deployed-local.json`.

This is the **zero-friction** proof that the deployment bytecode and constructor
work. No faucet, no private key, no browser extension.

## 3 · Deploy to Base Sepolia (live testnet)

Once you have a funded testnet wallet:

```bash
npm run deploy:base-sepolia
```

Output ends with the deployed address and writes `contracts/deployed.json`.
Explorer link is printed. **That address is your first real on-chain
receipt for TRSDOU.**

## 4 · Wire the address into the UI

Open `src/data/truth-coin-contract.ts` and set:

```ts
address: "0x..." // paste from step 3
```

Save. `/truth-coin` will now show a live `totalSupply` readout, the
soulbound flag, and a Basescan link — the on-chain panel is real.

## 5 · Verify source on Basescan (optional but good)

```bash
npm run verify:base-sepolia -- <DEPLOYED_ADDRESS>
```

## 6 · Mint the first dignity credit

Cast the tx from your wallet or run:

```bash
npx hardhat console --network baseSepolia
> const c = await ethers.getContractAt("TruthCoin", "<DEPLOYED_ADDRESS>")
> await c.issueDignityCredit("0xRecipient", ethers.parseUnits("50000", 18), "Sovereign Dignity Due — 5yr survival + nurse honor")
```

The `DignityCredit(recipient, amount, reason)` event is now permanently in
Base Sepolia's log history.

## Troubleshooting

- **"it won't let me find a testnet wallet"** — use the local path in
  section 2. The contract is proven to deploy without a wallet.
- **"deployer has 0 ETH"** — hit a faucet in step 0 (#3), wait a minute.
- **"insufficient funds"** — same, or the faucet only gave you dust.
- **"nonce too low / replacement fee too low"** — you have a pending tx;
  wait or bump gas in MetaMask.
- **RPC 429 / timeout** — Base's public RPC is rate-limited; get a free
  Alchemy or Infura URL and set `BASE_SEPOLIA_RPC_URL` in `.env`.
