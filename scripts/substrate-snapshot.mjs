// Cryptographically signed snapshot of the True Substrate.
//
// Produces a deterministic, re-derivable record of every file that defines the
// substrate at a point in time: file → sha256, plus a single root hash over the
// sorted (path, sha256) list. Nothing is invented: the root is a plain hash of
// the manifest bytes, and the manifest is reproducible by re-running this
// script on the same tree.
//
//   node scripts/substrate-snapshot.mjs
//
// Optional signing (the snapshot is unsigned unless a key is supplied):
//   SUBSTRATE_ED25519_SECRET=<64-hex seed> node scripts/substrate-snapshot.mjs
//
// The secret is read from the environment only. It is never written to the
// output, never logged, and no key is generated for you — an unsigned snapshot
// says "unsigned", it does not fake a signature.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ed25519 } from "@noble/curves/ed25519.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Every file whose bytes define the substrate. Adding a file here is a
// deliberate act — it widens what "the substrate" means.
const SUBSTRATE_FILES = [
  "src/data/known-anchors.ts",
  "src/data/terminus-ops.json",
  "src/data/truth-ledger.ts",
  "src/data/truth-chain.ts",
  "src/data/nodes.ts",
  "src/data/trc-governance.ts",
  "src/data/truth-coin-contract.ts",
  "contracts/src/TruthCoin.sol",
  "packages/protocol/spec/archangel.v0.json",
  "packages/protocol/spec/golden-vectors.json",
  "src/lib/signed-envelope.ts",
  "POLICY-OF-INTENT.md",
];

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

const entries = [];
const missing = [];
for (const rel of SUBSTRATE_FILES) {
  const abs = resolve(ROOT, rel);
  if (!existsSync(abs)) {
    missing.push(rel);
    continue;
  }
  const bytes = readFileSync(abs);
  entries.push({ path: rel, bytes: bytes.length, sha256: sha256(bytes) });
}
entries.sort((a, b) => (a.path < b.path ? -1 : 1));

// Root = sha256 over the canonical "sha256␠␠path\n" listing (sha256sum format),
// so anyone can reproduce it with: sha256sum <files> | LC_ALL=C sort | sha256sum
const listing = entries.map((e) => `${e.sha256}  ${e.path}\n`).join("");
const root = sha256(listing);

const snapshot = {
  v: "SUBSTRATE-SNAPSHOT/v1",
  taken_at: new Date().toISOString(),
  root_sha256: root,
  root_construction:
    "sha256 of the concatenation of `${sha256}  ${path}\\n` lines, entries sorted by path ascending (sha256sum-compatible)",
  files: entries,
  missing,
  signature: null,
};

const secret = process.env.SUBSTRATE_ED25519_SECRET;
if (secret && /^[0-9a-f]{64}$/i.test(secret)) {
  const seed = Uint8Array.from(secret.match(/../g).map((h) => parseInt(h, 16)));
  const pub = ed25519.getPublicKey(seed);
  const msg = new TextEncoder().encode(`SUBSTRATE-SNAPSHOT/v1|${root}|${snapshot.taken_at}`);
  const sig = ed25519.sign(msg, seed);
  const hex = (u8) => Buffer.from(u8).toString("hex");
  snapshot.signature = {
    alg: "ed25519",
    message: `SUBSTRATE-SNAPSHOT/v1|<root_sha256>|<taken_at>`,
    sig_ed25519: hex(sig),
    pub_ed25519: hex(pub),
  };
} else if (secret) {
  console.error("SUBSTRATE_ED25519_SECRET is set but is not a 64-hex seed — refusing to sign.");
  process.exit(1);
}

const outDir = "/mnt/documents";
mkdirSync(outDir, { recursive: true });
const stamp = snapshot.taken_at.slice(0, 10);
const outPath = `${outDir}/substrate-snapshot-${stamp}.json`;
const body = JSON.stringify(snapshot, null, 2) + "\n";
writeFileSync(outPath, body);
writeFileSync(`${outPath}.sha256.txt`, `${sha256(Buffer.from(body))}  ${outPath.split("/").pop()}\n`);

console.log(`files:      ${entries.length}${missing.length ? ` (missing ${missing.length}: ${missing.join(", ")})` : ""}`);
console.log(`root:       ${root}`);
console.log(`signed:     ${snapshot.signature ? snapshot.signature.pub_ed25519 : "NO — unsigned snapshot"}`);
console.log(`written:    ${outPath}`);
console.log("");
console.log("Next: `ots stamp` the snapshot file to anchor this root to Bitcoin,");
console.log("then record the resulting hash + block in src/data/known-anchors.ts.");
