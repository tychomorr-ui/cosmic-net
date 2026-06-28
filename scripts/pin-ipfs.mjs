#!/usr/bin/env node
// scripts/pin-ipfs.mjs
//
// Pass 3 — sovereign IPFS deploy helper.
//
// Strategy: shell out to an operator-controlled IPFS node (Kubo `ipfs`
// binary). No managed pinning service. If `ipfs` is not on PATH the
// script prints a clear remediation and exits with code 2.
//
// Usage:
//   node scripts/pin-ipfs.mjs [dir]
//
// `dir` defaults to `.output/public` (TanStack/Nitro static asset dir)
// and falls back to `dist/` if that doesn't exist.
//
// On success, prints the CIDv1 of the directory. Pin to an IPNS key or
// map an ENS contenthash yourself — those keys live with you, not us.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const candidates = [
  process.argv[2],
  ".output/public",
  "dist",
].filter(Boolean);

const dir = candidates.find((d) => existsSync(d));
if (!dir) {
  console.error("pin-ipfs: no build output found. Run `bun run build` first.");
  process.exit(1);
}

const which = spawnSync("ipfs", ["--version"], { encoding: "utf8" });
if (which.status !== 0) {
  console.error("pin-ipfs: `ipfs` (Kubo) not on PATH.");
  console.error("");
  console.error("Install your own node — do NOT use a managed pinning service:");
  console.error("  https://docs.ipfs.tech/install/command-line/");
  console.error("");
  console.error("Then re-run: node scripts/pin-ipfs.mjs " + dir);
  process.exit(2);
}

const abs = resolve(dir);
console.error(`pin-ipfs: adding ${abs} to your local IPFS node…`);

const add = spawnSync(
  "ipfs",
  ["add", "-r", "--quieter", "--cid-version=1", abs],
  { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
);
if (add.status !== 0) {
  console.error("pin-ipfs: `ipfs add` failed.");
  process.exit(add.status ?? 1);
}

const cid = add.stdout.trim().split(/\r?\n/).pop();
console.log(cid);

// Pass 5c — write a local build receipt so the /ops surface can display
// the CIDv1 of the artifact that was actually pinned. Public/ so that
// any subsequent build copies it into the served bundle; we also drop
// one alongside the build dir itself for direct inspection.
import { mkdirSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";
const receipt = {
  cid,
  dir: abs,
  bytes: (() => { try { return statSync(abs).size; } catch { return undefined; } })(),
  generated_at: new Date().toISOString(),
  tool: "scripts/pin-ipfs.mjs",
};
const receiptJson = JSON.stringify(receipt, null, 2) + "\n";
try {
  mkdirSync("public", { recursive: true });
  writeFileSync(join("public", "build-receipt.json"), receiptJson);
  writeFileSync(join(abs, "build-receipt.json"), receiptJson);
  console.error("pin-ipfs: wrote public/build-receipt.json + " + join(abs, "build-receipt.json"));
} catch (e) {
  console.error("pin-ipfs: could not write build-receipt.json:", e?.message ?? e);
}

console.error("");
console.error("Sovereign-aligned next steps (operator-only, no managed deps):");
console.error(`  ipfs name publish --key=cmap /ipfs/${cid}     # IPNS, your key`);
console.error(`  # or map ENS contenthash → ipfs://${cid} from your wallet`);
