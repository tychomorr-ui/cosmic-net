---
title: Deployment
---

# Deployment

Three independent distribution paths. None of them is a trust root.

## 1. Hosted web build

```bash
bun install
bun run build          # production bundle
bun run build:dev      # prerender-checked development build
```

Frontend changes go live when the deployment is published. Server functions and
API routes deploy immediately. The server runtime is a Cloudflare Worker: no
native modules, no child processes, no runtime module resolution.

Live: <https://universaltruth.life> (also `cosmictruth.lovable.app`).

## 2. Sovereign deploy (IPFS)

`bun run build` emits a Cloudflare Worker plus `dist/client` assets — there is
no `index.html`, so the build output alone is NOT servable from IPFS. Build a
static snapshot first:

```bash
bun run build
bun run static                      # crawls https://universaltruth.life → dist/ipfs
node scripts/pin-ipfs.mjs dist/ipfs # your own Kubo node → bafy…cid
```

### 2b. Pinata mirror (convenience only)

```bash
PINATA_JWT=… bun run pin:pinata dist/ipfs
```

Pinata is a **managed mirror, not a trust root**. It uploads with
`cidVersion: 1` and writes `public/build-receipt.json`. The same directory
pinned through your own Kubo node must yield the *same* CIDv1 — if the two
disagree, trust neither and rebuild.

### 2c. DNSLink — giving the CID a stable address

A raw CID changes on every build. DNSLink maps a domain to the current one.

Current snapshot:

```
bafybeicjixsytlbbqvbnsh3uhk7lbtuxnt3atuanroow3urbyntgyslbda
```

Add this TXT record at the registrar for `universaltruth.life`:

| Field | Value |
| --- | --- |
| Type | `TXT` |
| Name / Host | `_dnslink.ipfs` |
| Value | `dnslink=/ipfs/bafybeicjixsytlbbqvbnsh3uhk7lbtuxnt3atuanroow3urbyntgyslbda` |
| TTL | `300` |

That serves the snapshot at `https://ipfs.universaltruth.life/` through any
DNSLink-aware gateway. **Use the `ipfs.` subdomain, not the apex** — the apex
`_dnslink.universaltruth.life` would divert the main site away from the Worker
and break payments, `/mcp`, and auth.

Verify after propagation:

```bash
dig +short TXT _dnslink.ipfs.universaltruth.life
curl -sI https://ipfs.universaltruth.life/ | head -1
```

Each release: re-run `bun run static`, re-pin, and update the TXT value to the
new CID.

#### On IPNS

IPNS would remove the per-release DNS edit, but it needs a **long-lived node
republishing the record to the DHT** — records expire in ~24h. Hosted signing
services (w3name and similar) store a signed record without announcing it to
the DHT, so public gateways return `500` for those names; this was tested, not
assumed. Until a mesh node runs `ipfs name publish` on a cron, DNSLink to an
immutable CID is the honest option: it works on every gateway today and cannot
silently go stale — a wrong CID is visibly wrong.

Load through a **subdomain** gateway (`https://<cid>.ipfs.dweb.link/`) or a
DNSLink root. Path gateways (`…/ipfs/<cid>/`) 404 the assets because the HTML
references absolute `/assets/...` paths.

### What the IPFS mirror does and does not do

Works: every public page, client-side verification (CID re-derivation,
Bitcoin anchor depth via mempool.space, signed node `/status` probes,
database reads).

Does not work: server functions, `/api/*` routes, `/mcp`, auth, Stripe. Those
need a server. IPFS serves bytes only — the mirror is a censorship-resistant
read surface, not a second backend.

Operators who do not trust the hosted build should load the pinned CID and
compare it against the CID published in the Audit Center.



## 3. Mesh nodes (ARCHANGEL daemon)

Each node serves an Ed25519-signed `/status` payload over TLS.

```bash
# Go daemon
cd node-daemon && make build && ./archangel

# or the self-contained Python bootstrap
python3 public/signed-status-server.py
```

Node bootstrap helpers: `scripts/mesh-bootstrap.sh`, `scripts/deploy-blade.sh`,
`scripts/valkyrie-bootstrap.sh`. Pinned public keys live in `src/data/nodes.ts`
— a new node is not trusted until its pubkey is added there.

Private keys are generated on the node. Only the public half leaves the host.

## 4. Contracts

```bash
cd contracts
npm install
npm run preflight                    # must be 8/8 PASS, exit 0
npm run deploy:base-sepolia          # testnet
npm run verify:base-sepolia <ADDR>   # requires BASESCAN_API_KEY
node scripts/prepare-safe-transfer.js
```

Mainnet is gated on `contracts/MAINNET-CHECKLIST.md`: Safe 2-of-3 created,
audit report received, governance values injected into
`src/data/trc-governance.ts`, then the two-step ownership handoff.

## 5. Scheduled verification

`pg_cron` job `reprobe-mesh-15m` calls `/api/public/hooks/reprobe` every 15
minutes. The hook re-derives the CID and verifies the signature server-side and
writes to `node_probes` / `node_probes_latest`. Those rows are derived data —
the signed payload remains the source of truth.

## 6. Environment

Copy `template.env`, fill in what the target needs, and keep secrets in the
platform secret store. Server secrets must be read inside handlers.

## 7. Release checklist

1. `bunx vitest run` — green.
2. `bun run lint` — clean.
3. `bun run build` — succeeds.
4. `node scripts/substrate-snapshot.mjs` — record the root.
5. `node scripts/build-manifest.mjs` — record the Golden Truth CID.
6. Anchor the manifest via OpenTimestamps; record the block height in
   `src/data/known-anchors.ts`.
7. Publish, then confirm the Audit Center reflects the new version and CID.
