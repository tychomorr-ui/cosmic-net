// Hardhat config for Truth Coin (TRC) — Base Sepolia testnet deploy.
// Usage (from /contracts):
//   npm install
//   cp .env.example .env      # fill in PRIVATE_KEY and (optionally) BASESCAN_API_KEY
//   npx hardhat compile
//   npx hardhat run scripts/deploy.js --network baseSepolia
//
// The deploy script prints the deployed address AND writes it to
// contracts/deployed.json so you can paste it into
// src/data/truth-coin-contract.ts.

require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || "";

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  paths: {
    sources: "./src",      // TruthCoin.sol lives at contracts/src/TruthCoin.sol
    artifacts: "./artifacts",
    cache: "./cache",
    tests: "./test",
  },
  networks: {
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      chainId: 84532,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
      chainId: 11155111,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      baseSepolia: BASESCAN_API_KEY,
      sepolia: BASESCAN_API_KEY,
    },
    customChains: [
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
    ],
  },
};
