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

```bash
bun run build
node scripts/pin-ipfs.mjs      # requires Kubo `ipfs` on PATH
# → bafy…cid
```

### 2b. Pinata mirror (convenience only)

```bash
bun run build
PINATA_JWT=… bun run pin:pinata   # or PINATA_API_KEY + PINATA_API_SECRET
```

Pinata is a **managed mirror, not a trust root**. It uploads `dist/client`
with `cidVersion: 1` and writes `public/build-receipt.json`. The same build
pinned through your own Kubo node must yield the *same* CIDv1 — if the two
disagree, trust neither and rebuild.

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
