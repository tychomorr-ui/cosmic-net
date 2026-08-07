#!/usr/bin/env node
// scripts/build-static.mjs
//
// Snapshot the app as a static, IPFS-servable directory (`dist/ipfs`).
//
// WHY THIS EXISTS: `bun run build` produces a Cloudflare Worker (SSR) plus
// `dist/client` assets — there is no index.html, so the build output alone
// cannot be served from IPFS. This script fetches the server-rendered HTML for
// every public route from a running origin and mirrors every same-origin asset
// it references, producing a self-contained directory.
//
// HONEST LIMITS of the IPFS mirror:
//   - Server functions, /api/* routes, /mcp, auth and Stripe DO NOT work.
//     They need a server; IPFS serves bytes only.
//   - Client-side reads (Supabase, mempool.space, IPFS gateways, node /status
//     probes) still work, so the Anchor · Verify · Display surfaces stay usable.
//   - Absolute asset paths (/assets/...) require a SUBDOMAIN gateway
//     (bafy….ipfs.dweb.link) or an IPNS/DNSLink root. A path gateway
//     (…/ipfs/<cid>/) will 404 the assets.
//   - The snapshot is only as current as the origin you crawl. Crawl the
//     PUBLISHED origin after publishing, so the mirror matches production.
//
// Usage:
//   bun scripts/build-static.mjs [https://universaltruth.life]

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { SITEMAP_SECTIONS } from "../src/lib/sitemap-routes.ts";

const origin = (process.argv[2] ?? "https://universaltruth.life").replace(/\/$/, "");
const OUT = "dist/ipfs";

const probe = await fetch(origin).catch(() => null);
if (!probe?.ok) {
  console.error(`build-static: ${origin} did not answer 200. Publish first, or pass an origin.`);
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });

const paths = [...new Set(SITEMAP_SECTIONS.flatMap((s) => s.paths))];
const assets = new Set(["/favicon.ico", "/robots.txt", "/llms.txt"]);
const failed = [];
let ok = 0;

function collectAssets(html) {
  for (const m of html.matchAll(/(?:src|href)="(\/[^"]+)"/g)) {
    const url = m[1];
    if (url.startsWith("//")) continue;
    if (/\.(js|mjs|css|woff2?|ttf|png|jpe?g|svg|webp|ico|json|txt|py)$/.test(url)) {
      assets.add(url.split("?")[0]);
    }
  }
}

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
  collectAssets(html);
  ok++;
  console.error(`  page  ${p}`);
}

let assetOk = 0;
for (const a of assets) {
  const res = await fetch(`${origin}${a}`);
  if (!res.ok) {
    failed.push(`${a} → HTTP ${res.status}`);
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const dest = join(OUT, a);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, buf);
  assetOk++;
}

console.error("");
console.error(`build-static: ${ok}/${paths.length} routes, ${assetOk}/${assets.size} assets → ${OUT}`);
if (failed.length) {
  console.error("build-static: FAILED (not in the snapshot):");
  for (const f of failed) console.error("  ✗ " + f);
  process.exit(1);
}
console.error("Next: node scripts/pin-pinata.mjs dist/ipfs   (or scripts/pin-ipfs.mjs dist/ipfs)");
