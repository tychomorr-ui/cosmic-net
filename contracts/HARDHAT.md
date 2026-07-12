# Truth Coin · Hardhat Deploy (Base Sepolia)

Foundry version lives in `README.md`. This is the Hardhat path — same
contract (`TruthCoin.sol`), one command to deploy after setup.

## 0 · One-time prerequisites (Lovable can't do these for you)

1. **Node 18+** installed locally.
2. **A fresh testnet wallet + private key** (MetaMask → create new account →
   export private key). **Never reuse a mainnet key.**
3. **Base Sepolia ETH** (free, ~1 minute):
   - https://www.alchemy.com/faucets/base-sepolia
   - https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
4. *(Optional)* Basescan API key for source verification:
   https://basescan.org/myapikey

## 1 · Install & configure

```bash
cd contracts
npm install
cp .env.example .env
# edit .env, paste PRIVATE_KEY (0x…) and optional BASESCAN_API_KEY
```

## 2 · Prove it works locally (no gas, no network)

```bash
npx hardhat compile
npx hardhat test
```

All five tests must pass — that's your local proof the contract does what
it says before you spend a satoshi.

## 3 · Deploy to Base Sepolia

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

- **"deployer has 0 ETH"** — hit the faucet in step 0 (#3), wait a minute.
- **"insufficient funds"** — same, or the faucet only gave you dust.
- **"nonce too low / replacement fee too low"** — you have a pending tx;
  wait or bump gas in MetaMask.
- **RPC 429 / timeout** — Base's public RPC is rate-limited; get a free
  Alchemy or Infura URL and set `BASE_SEPOLIA_RPC_URL` in `.env`.
