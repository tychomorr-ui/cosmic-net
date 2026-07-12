// Local Hardhat deploy — zero wallet, zero faucet, zero network.
// Spins up an in-memory Hardhat node, deploys with the built-in funded
// signer, prints the address, and writes contracts/deployed-local.json.
// This proves the deployment bytecode works without touching any testnet.

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const net = hre.network.name;
  const bal = await hre.ethers.provider.getBalance(deployer.address);

  console.log("network :", net);
  console.log("deployer:", deployer.address);
  console.log("balance :", hre.ethers.formatEther(bal), "ETH (local fake ETH)");

  const Factory = await hre.ethers.getContractFactory("TruthCoin");
  const contract = await Factory.deploy();
  const txHash = contract.deploymentTransaction()?.hash;
  await contract.waitForDeployment();
  const address = await contract.getAddress();

  const manifesto = await contract.MANIFESTO_HASH();
  const supply = await contract.totalSupply();
  const transfers = await contract.transfersEnabled();

  // Mint a local demo dignity credit so the readout panel has something to show
  const demo = await hre.ethers.getSigners();
  const demoAmt = hre.ethers.parseUnits("50000", 18);
  const tx = await contract.issueDignityCredit(
    deployer.address,
    demoAmt,
    "Local demo — dignity credit"
  );
  await tx.wait();

  console.log("");
  console.log("✅ TruthCoin deployed locally");
  console.log("   address        :", address);
  console.log("   manifesto hash :", manifesto);
  console.log("   totalSupply    :", (await contract.totalSupply()).toString());
  console.log("   transfers      :", transfers);
  console.log("   demo credit    : minted", hre.ethers.formatUnits(demoAmt, 18), "TRC to deployer");
  console.log("");
  console.log("This is a local in-memory network. The address is NOT on any public chain.");

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
    path.join(__dirname, "..", "deployed-local.json"),
    JSON.stringify(out, null, 2)
  );
  console.log("\nWrote contracts/deployed-local.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
