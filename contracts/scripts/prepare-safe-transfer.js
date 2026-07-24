#!/usr/bin/env node
/**
 * prepare-safe-transfer.js
 *
 * Encodes the `transferOwnership(<safe>)` calldata for TruthCoin and prints the
 * exact ceremony steps. It NEVER broadcasts anything and NEVER touches a key.
 *
 *   node scripts/prepare-safe-transfer.js --safe 0xSAFE... [--contract 0xTRC...]
 *
 * If --safe is omitted, the script reads src/data/trc-governance.ts's TRC_SAFE
 * address. If that is still empty (it is, by default), the script halts.
 */

const fs = require("fs");
const path = require("path");
const { keccak256, toUtf8Bytes, getAddress, isAddress } = require("ethers");

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

function readPinned(file, re) {
  try {
    const src = fs.readFileSync(path.join(__dirname, "..", "..", file), "utf8");
    const m = src.match(re);
    return m && m[1] ? m[1] : "";
  } catch {
    return "";
  }
}

function main() {
  const safeArg = arg("safe");
  const safeFromCode = readPinned(
    "src/data/trc-governance.ts",
    /address:\s*"(0x[0-9a-fA-F]{40})"/
  );
  const safe = safeArg || safeFromCode;

  const contractArg = arg("contract");
  const contractFromCode = readPinned(
    "src/data/truth-coin-contract.ts",
    /address:\s*"(0x[0-9a-fA-F]{40})"/
  );
  const contract = contractArg || contractFromCode;

  if (!safe) {
    console.error(
      [
        "HALT: no Safe address.",
        "",
        "The Safe does not exist yet, or has not been recorded.",
        "Create it on Base, then either:",
        "  - paste it into TRC_SAFE.address in src/data/trc-governance.ts, or",
        "  - pass it here:  node scripts/prepare-safe-transfer.js --safe 0x...",
        "",
        "No placeholder or example address will be substituted.",
      ].join("\n")
    );
    process.exit(1);
  }
  if (!isAddress(safe)) {
    console.error(`HALT: --safe "${safe}" is not a valid address.`);
    process.exit(1);
  }
  if (!contract) {
    console.error(
      "HALT: no TruthCoin address. Pass --contract 0x... or pin it in src/data/truth-coin-contract.ts."
    );
    process.exit(1);
  }
  if (!isAddress(contract)) {
    console.error(`HALT: --contract "${contract}" is not a valid address.`);
    process.exit(1);
  }

  const safeCs = getAddress(safe);
  const trcCs = getAddress(contract);

  const sigTransfer = keccak256(toUtf8Bytes("transferOwnership(address)")).slice(0, 10);
  const sigAccept = keccak256(toUtf8Bytes("acceptOwnership()")).slice(0, 10);
  const transferData = sigTransfer + safeCs.slice(2).toLowerCase().padStart(64, "0");

  console.log("TruthCoin ownership handoff — UNSIGNED CALLDATA ONLY");
  console.log("=".repeat(62));
  console.log("contract (to) :", trcCs);
  console.log("new owner     :", safeCs);
  console.log("value         : 0");
  console.log("");
  console.log("STEP 1 — from the CURRENT owner (deployer key):");
  console.log("  function : transferOwnership(address)");
  console.log("  calldata :", transferData);
  console.log("");
  console.log("STEP 2 — from the SAFE (as a Safe transaction):");
  console.log("  to       :", trcCs);
  console.log("  function : acceptOwnership()");
  console.log("  calldata :", sigAccept);
  console.log("");
  console.log("STEP 3 — verify, do not assume:");
  console.log("  owner()        == " + safeCs);
  console.log("  pendingOwner() == 0x0000000000000000000000000000000000000000");
  console.log("  old deployer key can no longer call issueDignityCredit()");
  console.log("");
  console.log("This script broadcast nothing. Both steps are operator-signed.");
}

main();
