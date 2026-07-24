// Mainnet readiness dry-run. Deploys TruthCoin to an in-memory Hardhat
// network and asserts every condition on the mainnet checklist. Exits
// non-zero on ANY deviation. Nothing is broadcast to a live network.
//
//   npm run preflight
//   MULTISIG=0x... npm run preflight   # also rehearses the owner handoff

const hre = require("hardhat");

const EXPECTED_MANIFESTO =
  "0x4edab582bd0eb5a72ad58df4fe677d2af685e254539b9e72c78ebc95f5ef70f7";

const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
}

async function main() {
  const [deployer, nominee] = await hre.ethers.getSigners();
  console.log("preflight network:", hre.network.name);
  console.log("deployer         :", deployer.address, "\n");

  const c = await (await hre.ethers.getContractFactory("TruthCoin")).deploy();
  await c.waitForDeployment();
  const address = await c.getAddress();
  console.log("dry-run address  :", address, "\n");

  // 1 — soulbinding: manifesto hash equality
  const manifesto = await c.MANIFESTO_HASH();
  check(
    "manifesto hash equals BTC-anchored manifesto (block 954181)",
    manifesto.toLowerCase() === EXPECTED_MANIFESTO,
    manifesto,
  );

  // 2 — transfers must be off at birth
  check("transfersEnabled is false at deploy", (await c.transfersEnabled()) === false);

  // 3 — no premint
  check("totalSupply is 0 at deploy", (await c.totalSupply()) === 0n);

  // 4 — soulbound enforcement is real, not cosmetic
  await c.issueDignityCredit(deployer.address, 1n, "preflight");
  let reverted = false;
  try {
    await c.transfer(nominee.address, 1n);
  } catch {
    reverted = true;
  }
  check("transfer() reverts while soulbound", reverted);

  // 5 — mint is owner-gated (no open mint, no attestation-triggered mint path)
  let mintGated = false;
  try {
    await c.connect(nominee).issueDignityCredit(nominee.address, 1n, "x");
  } catch {
    mintGated = true;
  }
  check("issueDignityCredit is owner-only", mintGated);

  // 6 — ownership handoff is two-step (cannot be lost to a typo)
  const multisig = process.env.MULTISIG;
  const target = multisig || nominee.address;
  await c.transferOwnership(target);
  check(
    "transferOwnership does not change owner immediately",
    (await c.owner()) === deployer.address,
    "pendingOwner=" + (await c.pendingOwner()),
  );
  if (multisig) {
    console.log(
      "\nNOTE: MULTISIG set to " +
        multisig +
        " — acceptOwnership() must be executed BY that multisig on-chain. " +
        "Preflight cannot sign for it; that step stays manual and ceremonial.\n",
    );
  } else {
    await c.connect(nominee).acceptOwnership();
    check("acceptOwnership completes handoff", (await c.owner()) === nominee.address);
    let oldOwnerLocked = false;
    try {
      await c.issueDignityCredit(deployer.address, 1n, "x");
    } catch {
      oldOwnerLocked = true;
    }
    check("previous owner loses mint authority after handoff", oldOwnerLocked);
  }

  const failed = checks.filter((c) => !c.ok);
  console.log("\n" + (checks.length - failed.length) + "/" + checks.length + " checks passed");
  if (failed.length) {
    console.error("\nHALT — mainnet deployment is NOT authorized. Failing checks:");
    for (const f of failed) console.error("  - " + f.name);
    process.exit(1);
  }
  console.log("\nDry-run congruent. Mainnet deploy remains a manual, operator-signed act.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
