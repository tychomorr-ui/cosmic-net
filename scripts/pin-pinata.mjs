#!/usr/bin/env node
// scripts/pin-pinata.mjs
//
// Pinata deploy path. This is a MANAGED pinning service — it is a
// convenience mirror, not a trust root. The sovereign path remains
// `scripts/pin-ipfs.mjs` against your own Kubo node. Both must produce the
// SAME CIDv1 for the same build output; if they diverge, trust neither.
//
// Usage:
//   PINATA_JWT=... node scripts/pin-pinata.mjs [dir]
//
// `dir` defaults to `.output/public`, falling back to `dist/`.
// On success prints the CIDv1 and writes public/build-receipt.json.

import { existsSync, readdirSync, statSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join, relative, sep } from "node:path";

const JWT = process.env["PINATA_JWT"];
const API_KEY = process.env["PINATA_API_KEY"];
const API_SECRET = process.env["PINATA_API_SECRET"];

if (!JWT && !(API_KEY && API_SECRET)) {
  console.error("pin-pinata: no credentials. Set PINATA_JWT (preferred) or PINATA_API_KEY + PINATA_API_SECRET.");
  process.exit(2);
}

const candidates = [process.argv[2], ".output/public", "dist"].filter(Boolean);
const dir = candidates.find((d) => existsSync(d));
if (!dir) {
  console.error("pin-pinata: no build output found. Run `bun run build` first.");
  process.exit(1);
}
const abs = resolve(dir);

function walk(root) {
  const out = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const p = join(root, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.isFile()) out.push(p);
  }
  return out;
}

const files = walk(abs);
if (files.length === 0) {
  console.error(`pin-pinata: ${abs} is empty.`);
  process.exit(1);
}

const totalBytes = files.reduce((n, f) => n + statSync(f).size, 0);
console.error(`pin-pinata: uploading ${files.length} files (${totalBytes} bytes) from ${abs}…`);

const rootName = abs.split(sep).pop() ?? "build";
const form = new FormData();
for (const f of files) {
  const rel = relative(abs, f).split(sep).join("/");
  form.append("file", new Blob([readFileSync(f)]), `${rootName}/${rel}`);
}
form.append(
  "pinataMetadata",
  JSON.stringify({ name: `universaltruth-${new Date().toISOString()}` }),
);
form.append("pinataOptions", JSON.stringify({ cidVersion: 1, wrapWithDirectory: false }));

const headers = JWT
  ? { Authorization: `Bearer ${JWT}` }
  : { pinata_api_key: API_KEY, pinata_secret_api_key: API_SECRET };

const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
  method: "POST",
  headers,
  body: form,
});

const text = await res.text();
if (!res.ok) {
  console.error(`pin-pinata: upload failed — HTTP ${res.status}`);
  console.error(text.slice(0, 800));
  process.exit(1);
}

let payload;
try {
  payload = JSON.parse(text);
} catch {
  console.error("pin-pinata: unparseable response:", text.slice(0, 400));
  process.exit(1);
}

const cid = payload.IpfsHash;
console.log(cid);

const receipt = {
  cid,
  dir: abs,
  files: files.length,
  bytes: totalBytes,
  pin_size: payload.PinSize ?? null,
  pinned_at: payload.Timestamp ?? new Date().toISOString(),
  generated_at: new Date().toISOString(),
  tool: "scripts/pin-pinata.mjs",
  service: "pinata (managed mirror — not a trust root)",
};
const json = JSON.stringify(receipt, null, 2) + "\n";
try {
  mkdirSync("public", { recursive: true });
  writeFileSync(join("public", "build-receipt.json"), json);
  writeFileSync(join(abs, "build-receipt.json"), json);
  console.error("pin-pinata: wrote public/build-receipt.json");
} catch (e) {
  console.error("pin-pinata: could not write build-receipt.json:", e?.message ?? e);
}

console.error("");
console.error("Verify independently — do not take Pinata's word for it:");
console.error(`  ipfs add -r --quieter --cid-version=1 ${abs}   # must print the same CID`);
console.error(`  https://gateway.pinata.cloud/ipfs/${cid}`);
console.error(`  https://ipfs.io/ipfs/${cid}`);
