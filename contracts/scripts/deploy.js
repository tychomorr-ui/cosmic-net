// Deploy TruthCoin to the selected network. Prints address, tx hash, and
// writes contracts/deployed.json. After success, paste `address` into
// src/data/truth-coin-contract.ts (TRC_CONTRACT.address).

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const net = hre.network.name;
  const bal = await hre.ethers.provider.getBalance(deployer.address);

  console.log("network :", net);
  console.log("deployer:", deployer.address);
  console.log("balance :", hre.ethers.formatEther(bal), "ETH");

  if (bal === 0n) {
    throw new Error(
      "deployer has 0 ETH — fund it from a faucet (Base Sepolia: https://www.alchemy.com/faucets/base-sepolia)"
    );
  }

  const Factory = await hre.ethers.getContractFactory("TruthCoin");
  const contract = await Factory.deploy();
  const txHash = contract.deploymentTransaction()?.hash;
  console.log("deploy tx:", txHash);
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  // Sanity: read the constant back
  const manifesto = await contract.MANIFESTO_HASH();
  const supply = await contract.totalSupply();
  const transfers = await contract.transfersEnabled();

  console.log("");
  console.log("✅ TruthCoin deployed");
  console.log("   address        :", address);
  console.log("   manifesto hash :", manifesto);
  console.log("   totalSupply    :", supply.toString());
  console.log("   transfers      :", transfers);
  console.log("");
  console.log("Explorer:");
  if (net === "baseSepolia") {
    console.log("   https://sepolia.basescan.org/address/" + address);
  } else if (net === "sepolia") {
    console.log("   https://sepolia.etherscan.io/address/" + address);
  }

  const out = {
    network: net,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    address,
    deployer: deployer.address,
    txHash,
    manifestoHash: manifesto,
    deployedAt: new Date().toISOString(),
  };
  fs.writeFileSync(
    path.join(__dirname, "..", "deployed.json"),
    JSON.stringify(out, null, 2)
  );
  console.log("\nWrote contracts/deployed.json");
  console.log(
    "\nNext: paste this address into src/data/truth-coin-contract.ts → TRC_CONTRACT.address"
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
