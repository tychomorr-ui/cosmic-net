#!/usr/bin/env node
/**
 * audit-bundle.js — bundle everything an external auditor needs into one
 * self-contained, hash-manifested text file.
 *
 *   node scripts/audit-bundle.js [--out /mnt/documents/truthcoin-audit-bundle.txt]
 *
 * Contents: TruthCoin.sol, the test suite, the preflight assertions, the
 * mainnet checklist, hardhat config — each with its own SHA-256, plus a
 * bundle-level SHA-256 so the auditor can prove they reviewed this exact byte
 * sequence (and so it can be OTS-stamped).
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");

const FILES = [
  "src/TruthCoin.sol",
  "test/TruthCoin.test.js",
  "scripts/preflight.js",
  "scripts/deploy.js",
  "scripts/prepare-safe-transfer.js",
  "hardhat.config.cjs",
  "package.json",
  "MAINNET-CHECKLIST.md",
];

const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");

function main() {
  const outIdx = process.argv.indexOf("--out");
  const out =
    outIdx > -1
      ? process.argv[outIdx + 1]
      : "/mnt/documents/truthcoin-audit-bundle.txt";

  const parts = [];
  const index = [];
  const missing = [];

  for (const rel of FILES) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) {
      missing.push(rel);
      continue;
    }
    const body = fs.readFileSync(abs, "utf8");
    const h = sha(body);
    index.push(`  ${h}  ${rel}  (${Buffer.byteLength(body)} bytes)`);
    parts.push(
      [
        "=".repeat(78),
        `FILE   : ${rel}`,
        `SHA256 : ${h}`,
        "=".repeat(78),
        body.replace(/\s*$/, ""),
        "",
      ].join("\n")
    );
  }

  const header = [
    "TRUTHCOIN (TRS) — AUDIT BUNDLE",
    "=".repeat(78),
    "",
    "Scope: the soulbound ERC-20 `TruthCoin` and its deployment/ownership",
    "tooling. No mainnet deployment exists. The only live deployment is on",
    "Base Sepolia (testnet).",
    "",
    "What we are asking to be reviewed:",
    "  1. Soulbound invariant — transfer/transferFrom/approve must be",
    "     unusable while `transfersEnabled == false`, with no bypass.",
    "  2. `enableTransfers()` one-way semantics and access control.",
    "  3. Two-step ownership handoff (transferOwnership / acceptOwnership):",
    "     no path to burn or hijack ownership; pendingOwner cleared on accept.",
    "  4. `issueDignityCredit()` owner-gating; no autonomous or metric-driven",
    "     mint path anywhere in the codebase.",
    "  5. MANIFESTO_HASH immutability. Its value must equal the SHA-256",
    "     0x4edab582bd0eb5a72ad58df4fe677d2af685e254539b9e72c78ebc95f5ef70f7",
    "     anchored in Bitcoin block 954181.",
    "  6. Any reentrancy, overflow, or event-emission gaps.",
    "",
    "Explicitly out of scope (does not exist): DAO/governance contract,",
    "staking, liquidity, price oracle, bridging, upgradeability (contract is",
    "non-upgradeable by design).",
    "",
    `Generated (UTC): ${new Date().toISOString()}`,
    "",
    "FILE INDEX (sha256):",
    ...index,
    missing.length ? `\nMISSING (not bundled): ${missing.join(", ")}` : "",
    "",
  ].join("\n");

  const body = header + "\n" + parts.join("\n");
  const bundleSha = sha(body);
  const final =
    body +
    "\n" +
    "=".repeat(78) +
    "\nBUNDLE SHA256 (of everything above this line):\n" +
    bundleSha +
    "\n" +
    "Stamp this with OpenTimestamps before sending:\n" +
    `  ots stamp ${path.basename(out)}\n` +
    "=".repeat(78) +
    "\n";

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, final);

  console.log(`wrote  : ${out}`);
  console.log(`files  : ${index.length}${missing.length ? ` (missing ${missing.length})` : ""}`);
  console.log(`bytes  : ${Buffer.byteLength(final)}`);
  console.log(`sha256 : ${bundleSha}`);
  if (missing.length) {
    console.error(`WARNING: not bundled -> ${missing.join(", ")}`);
    process.exit(1);
  }
}

main();
