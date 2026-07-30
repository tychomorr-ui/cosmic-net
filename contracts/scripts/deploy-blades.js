// Deploy DigitalOre (DOU) and KetherGateRegistry with a real M-of-N signer set.
//
// Both constructors take (address[] signers, uint256 threshold). The threshold
// is load bearing: governed parameter changes are reachable only through
// propose -> approveProposal x threshold -> executeProposal.
//
// Usage (from /contracts):
//   GOVERNANCE_SIGNERS=0xaaa,0xbbb,0xccc GOVERNANCE_THRESHOLD=2 \
//     npx hardhat run scripts/deploy-blades.js --network baseSepolia
//
// Ownership (mint / refine / attest) starts on the deployer and should be
// handed to the Safe with the two-step flow:
//   transferOwnership(safe)  then  safe calls acceptOwnership()

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

function readSigners(deployer) {
  const raw = (process.env.GOVERNANCE_SIGNERS || "").trim();
  if (!raw) {
    console.warn("GOVERNANCE_SIGNERS not set — falling back to deployer-only, threshold 1.");
    console.warn("This is acceptable for a local dry run ONLY. Never for a public deploy.");
    return { signers: [deployer], threshold: 1 };
  }
  const signers = raw.split(",").map((s) => ethers.getAddress(s.trim()));
  const threshold = Number(process.env.GOVERNANCE_THRESHOLD || 2);
  if (!Number.isInteger(threshold) || threshold < 1 || threshold > signers.length) {
    throw new Error(`GOVERNANCE_THRESHOLD must be an integer in 1..${signers.length}`);
  }
  if (new Set(signers).size !== signers.length) throw new Error("duplicate signer address");
  return { signers, threshold };
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const { signers, threshold } = readSigners(deployer.address);
  const net = await ethers.provider.getNetwork();

  console.log("network   :", net.name, `(chainId ${net.chainId})`);
  console.log("deployer  :", deployer.address);
  console.log("governance:", `${threshold}-of-${signers.length}`, signers.join(", "), "\n");

  const Ore = await ethers.getContractFactory("DigitalOre");
  const ore = await Ore.deploy(signers, threshold);
  await ore.waitForDeployment();
  const oreAddr = await ore.getAddress();
  console.log("DigitalOre         :", oreAddr);

  const Reg = await ethers.getContractFactory("KetherGateRegistry");
  const reg = await Reg.deploy(signers, threshold);
  await reg.waitForDeployment();
  const regAddr = await reg.getAddress();
  console.log("KetherGateRegistry :", regAddr);

  // Post-deploy invariants. Any failure here is a hard stop.
  const checks = [
    ["DOU transfers locked at deploy", (await ore.transfersEnabled()) === false],
    ["DOU supply is zero at deploy", (await ore.totalSupply()) === 0n],
    ["DOU threshold recorded", (await ore.threshold()) === BigInt(threshold)],
    ["DOU owner is deployer", (await ore.owner()) === deployer.address],
    ["DOU pendingOwner empty", (await ore.pendingOwner()) === ethers.ZeroAddress],
    ["Registry threshold recorded", (await reg.threshold()) === BigInt(threshold)],
    ["Registry empty at deploy", (await reg.getRegisteredEntitiesCount()) === 0n],
  ];

  console.log("");
  let failed = 0;
  for (const [label, ok] of checks) {
    console.log(`${ok ? "PASS " : "FAIL "} ${label}`);
    if (!ok) failed++;
  }
  if (failed) throw new Error(`${failed} post-deploy check(s) failed`);

  const out = {
    chainId: Number(net.chainId),
    deployer: deployer.address,
    governance: { signers, threshold },
    digitalOre: oreAddr,
    ketherGateRegistry: regAddr,
    deployedAt: new Date().toISOString(),
  };
  const file = path.join(__dirname, "..", `deployed-blades-${net.chainId}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 2) + "\n");
  console.log(`\nWrote ${file}`);
  console.log("\nNext: transferOwnership(<safe>) then have the Safe call acceptOwnership().");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
