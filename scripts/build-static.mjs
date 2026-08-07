#!/usr/bin/env node
// scripts/build-static.mjs
//
// Snapshot the app as a static, IPFS-servable directory.
//
// WHY THIS EXISTS: `bun run build` produces a Cloudflare Worker (SSR) plus
// `dist/client` assets — there is no index.html, so the build alone cannot be
// served from IPFS. This script crawls a running server and writes one
// prerendered index.html per public route into `dist/ipfs`, alongside the
// client assets.
//
// HONEST LIMITS of the IPFS mirror:
//   - Server functions, /api/* routes, /mcp, auth and Stripe DO NOT work.
//     They need a server; IPFS serves bytes only.
//   - Client-side reads (Supabase, mempool.space, IPFS gateways, node /status
//     probes) still work, so Anchor · Verify · Display surfaces stay usable.
//   - Absolute asset paths (/assets/...) require a SUBDOMAIN gateway
//     (bafy….ipfs.dweb.link) or IPNS/DNSLink root. A path gateway
//     (gateway/ipfs/<cid>/) will 404 the assets.
//
// Usage:
//   bun run dev                       # or: bunx vite preview
//   node scripts/build-static.mjs [http://localhost:8080]

import { mkdirSync, cpSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { SITEMAP_SECTIONS } from "../src/lib/sitemap-routes.ts";

const origin = (process.argv[2] ?? "http://localhost:8080").replace(/\/$/, "");
const OUT = "dist/ipfs";

if (!existsSync("dist/client")) {
  console.error("build-static: dist/client missing. Run `bun run build` first.");
  process.exit(1);
}

const probe = await fetch(origin, { redirect: "manual" }).catch(() => null);
if (!probe) {
  console.error(`build-static: nothing answering at ${origin}. Start the server first.`);
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
cpSync("dist/client", OUT, { recursive: true });

const paths = [...new Set(SITEMAP_SECTIONS.flatMap((s) => s.paths))];
let ok = 0;
const failed = [];

for (const p of paths) {
  const res = await fetch(`${origin}${p}`, { headers: { accept: "text/html" } });
  const html = await res.text();
  if (!res.ok || !html.includes("<html")) {
    failed.push(`${p} → HTTP ${res.status}`);
    continue;
  }
  const dir = p === "/" ? OUT : join(OUT, p);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), html);
  if (p === "/") writeFileSync(join(OUT, "404.html"), html); // gateway fallback
  ok++;
  console.error(`  ✓ ${p}`);
}

console.error("");
console.error(`build-static: wrote ${ok}/${paths.length} routes to ${OUT}`);
if (failed.length) {
  console.error("build-static: FAILED routes (not in the snapshot):");
  for (const f of failed) console.error("  ✗ " + f);
  process.exit(1);
}
console.error("Next: node scripts/pin-pinata.mjs dist/ipfs   (or scripts/pin-ipfs.mjs)");
