import * as dagJson from "@ipld/dag-json";
import { CID } from "multiformats/cid";
import { sha256 } from "multiformats/hashes/sha2";
import fs from "node:fs";
import crypto from "node:crypto";

const ops = JSON.parse(fs.readFileSync("src/data/terminus-ops.json","utf8"));
const SHA256_RE = /\b[a-f0-9]{64}\b/g;
const OTS_RE = /[\w.\-]+\.ots\b/g;

const receipts = [];
for (const e of ops) {
  const text = `${e.command}\n${e.result}`;
  const hashes = Array.from(new Set(text.match(SHA256_RE) ?? []));
  const otsFiles = Array.from(new Set(text.match(OTS_RE) ?? []));
  if (!hashes.length && !otsFiles.length) continue;
  receipts.push({ ts:e.ts, subsystem:e.subsystem, command:e.command, hashes, otsFiles });
}
receipts.sort((a,b)=> a.ts < b.ts ? 1 : -1);

// anchors known from operator records
const anchors = {
  "325037bda158c135794fb097f365822e7c5da01147282cb3cde032bc5e251f02": {anchored_at:1782774403019, block_height:955974, note:"truth-substrate-ledger-01-1.mhtml", source:"ots-verify"},
  "e54f67b589ff65af66e12f219e2693b8f341e26ec52ee89a69f57cfa2f30d0bc": {anchored_at:1782774403019, block_height:955967, note:"The XinUS Movement.txt", source:"ots-verify"},
  "0faeb10d3cf69ec65907f3de833d413f132a935aa7dd90d3557e7d5a18838ec3": {anchored_at:1782774403019, block_height:955974, note:"GO_OMNI_GO-001.txt", source:"ots-verify"},
  "0de8ed98f41bd656686793c67dec9108b5e29c10ccd6cb8fe272cbfab76c590b": {anchored_at:1782758859621, block_height:955889, note:"digital-ore-1782710516222.json — Bitcoin block 955889, 2026-06-28 PST", source:"ots-verify"},
  "fcff668eca6effffacd2c62dcc6209c34c97595ac3e98e8bbdff5fdfb3df4c66": {anchored_at:1782758859621, block_height:955897, note:"ots-verify.py — Bitcoin block 955897, 2026-06-28 PST", source:"ots-verify"},
  "8c426dc600f932157c4397e4303f8c09186ff0c5c8a73ada17550632b4abfa45": {anchored_at:Date.now(), block_height:955889, note:"Universal Justice Manifesto · Sovereign Runtime Declaration — alice@955889 bob@955889 finney@955894", source:"ots-verify"},
};
for (const [sha,a] of Object.entries(anchors)) a.sha256 = sha;

const flat = [];
for (const r of receipts) for (const sha of r.hashes) flat.push({ ts:r.ts, subsystem:r.subsystem, command:r.command, sha256:sha, ots_files:r.otsFiles });
flat.sort((a,b)=> a.ts === b.ts ? a.sha256.localeCompare(b.sha256) : a.ts < b.ts ? 1 : -1);
const enriched = flat.map(r => ({...r, anchor: anchors[r.sha256] ?? null}));
const anchored = enriched.filter(r=>r.anchor).length;
const pending = enriched.length - anchored;

const payload_cid = "baguqeeraxelewsouvvqozfabklpms6n7k3csumlqcoj4zlg6kn4on3qel67a";

const manifest = {
  v: "cmap.final-manifest/v1",
  generated_at: 0,
  payload_cid,
  receipts: enriched,
  anchors_total: Object.keys(anchors).length,
  receipts_total: enriched.length,
  anchored_count: anchored,
  pending_count: pending,
  coupling: (enriched.length && pending===0) ? "golden" : anchored>0 ? "partial" : "pending",
};

const bytes = dagJson.encode(manifest);
const hash = await sha256.digest(bytes);
const cid = CID.createV1(0x0129, hash).toString();
const shaHex = crypto.createHash("sha256").update(bytes).digest("hex");

fs.mkdirSync("/mnt/documents", {recursive:true});
fs.writeFileSync("/mnt/documents/golden-truth.manifest.json", bytes);
fs.writeFileSync("/mnt/documents/golden-truth.manifest.sha256.txt",
  `${shaHex}  golden-truth.manifest.json\nCID: ${cid}\nbytes: ${bytes.length}\npayload_cid: ${payload_cid}\nanchored: ${anchored}/${enriched.length}\n`);
console.log({cid, sha256: shaHex, bytes: bytes.length, anchored, total: enriched.length});
