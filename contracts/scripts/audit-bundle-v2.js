#!/usr/bin/env node
/**
 * audit-bundle-v2.js — companion bundle for the ADDITIVE contracts that were
 * not in frozen bundle 8f21bb6e…09a30 (SovereignOwnable, MultiSigGoverned,
 * DigitalOre, KetherGateRegistry).
 *
 *   node scripts/audit-bundle-v2.js [--out /mnt/documents/truthcoin-audit-bundle-v2.txt]
 *
 * Bundle v1 is frozen and is NOT regenerated or edited. This file is a
 * separate, separately-anchored scope.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");

const FILES = [
  "src/SovereignOwnable.sol",
  "src/MultiSigGoverned.sol",
  "src/DigitalOre.sol",
  "src/KetherGateRegistry.sol",
  "test/HardenedContracts.test.js",
  "scripts/deploy-blades.js",
  "hardhat.config.cjs",
  "package.json",
];

const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");

function main() {
  const outIdx = process.argv.indexOf("--out");
  const out =
    outIdx > -1
      ? process.argv[outIdx + 1]
      : "/mnt/documents/truthcoin-audit-bundle-v2.txt";

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
    "NEXINUS — AUDIT BUNDLE v2 (COMPANION, ADDITIVE SCOPE)",
    "=".repeat(78),
    "",
    "This bundle is ADDITIVE to frozen bundle",
    "8f21bb6e58e67ef925170b39b66d9bb78c2f416553919a0c57b8cb7509809a30",
    "(Bitcoin block 959472), which covers TruthCoin (TRS) and is unchanged.",
    "Nothing in bundle v1 was edited to produce this file.",
    "",
    "Scope: shared governance primitives and two new soulbound/registry",
    "contracts. NONE of these are deployed on any network — no testnet, no",
    "mainnet.",
    "",
    "What we are asking to be reviewed:",
    "  1. SovereignOwnable — two-step transferOwnership/acceptOwnership;",
    "     renounceOwnership() must always revert; pendingOwner cleared on",
    "     accept; no path to burn or hijack ownership.",
    "  2. MultiSigGoverned — real M-of-N threshold: propose / approveProposal /",
    "     revokeProposalApproval / executeProposal. Confirm the threshold is",
    "     actually enforced at execution, approvals cannot be double-counted,",
    "     signer-set changes cannot strand the contract, and executed or",
    "     cancelled proposals cannot be replayed.",
    "  3. DigitalOre (DOU) — soulbound ERC-20. Confirm transfer/transferFrom/",
    "     approve are symmetric and unusable while locked; mint rate limits are",
    "     denominated in SECONDS (not blocks) and cannot be bypassed by",
    "     timestamp manipulation within miner tolerance; cursor-based dividend",
    "     accrual cannot replay a record or double-pay; claimDividend has no",
    "     reentrancy or rounding-drain path; grade math cannot truncate to zero",
    "     or overflow.",
    "  4. KetherGateRegistry — ASCII name normalization must make homoglyph and",
    "     case-variant impersonation impossible; all identity reads paginated",
    "     and gas-bounded; attestClaim records an owner ASSERTION only",
    "     (claimedManifestHash / claimedBitcoinBlockHeight) and performs no",
    "     on-chain verification — confirm no code or naming implies otherwise;",
    "     conflicting re-anchors must revert, not silently overwrite.",
    "  5. General — reentrancy, arithmetic, access control, event-emission gaps,",
    "     and any interaction hazard between MultiSigGoverned and",
    "     SovereignOwnable when both gate the same function.",
    "",
    "Explicitly out of scope (does not exist): DAO/token-voting governance,",
    "staking, liquidity, price oracle, bridging, upgradeability (all contracts",
    "are non-upgradeable by design), and everything already covered by v1.",
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
