# cMAP — Cosmic Mesh Alignment Protocol

Sovereign witness console for a peer-to-peer mesh. No central capture point,
no managed relays, no silent overwrites. The browser is a verifier and a
witness — never the source of truth.

## Naming

- **cMAP** — Cosmic Mesh Alignment Protocol (the protocol).
- **Cosmic Mesh** — the peer-to-peer fabric it aligns.
- *not* "Cosmic Net" — net implies entrapment and hierarchy; mesh is the
  intended topology. All legacy `Cosmic Net` / `CosmicNet` / `cosmic-net` /
  `COSMIC_NET` identifiers were retired in the rename pass; new code must
  use the `Cosmic Mesh` / `CosmicMesh` / `cosmic-mesh` / `COSMIC_MESH`
  forms (or the `cMAP` abbreviation).

## Doctrine (non-negotiable)

1. Private keys are generated on the node. Only the public half leaves.
2. Verifier defaults to `UNVERIFIED` every render. Only an explicit `true`
   flips the state. Any thrown exception ⇒ `UNVERIFIED`, never green.
3. Verifier signs over raw response bytes of the canonicalized payload,
   before any `JSON.parse`.
4. `counter` stays an opaque string until after verify.
5. Browser enforces tight TTL (≤120s). Aggregator enforces per-node counter
   monotonicity.
6. Zero-telemetry, local-first, signed-provenance.

## Stack

- TanStack Start v1 (React 19, Vite 7), currently distributed via a Cloudflare
  Worker shell. The bundle is also IPFS-deployable — see "Sovereign deploy".
- Tailwind v4 (`src/styles.css`), shadcn primitives.
- `@cosmic-mesh/protocol` — frozen ARCHANGEL/v0 wire contract shared with
  the Go `archangel` daemon under `node-daemon/`.
- `src/lib/sovereign-store.ts` — synchronous reads from localStorage,
  write-through mirror to IndexedDB. Truth Chain + Truth Ledger persist
  through this layer; nothing is round-tripped to a backend.
- `src/lib/telemetry.ts` — three-mode telemetry switch, default **OFF**.
  `LOCAL` writes to IndexedDB only. `POSTHOG` is the only mode that
  touches the network, and it is opt-in.

## Routes

`/` is the unified console (uplink, tesseract projection, 13-blade AXIS).
`/pam` carries the **Doctrine Audit** — every UI claim mapped to the
in-browser evidence that proves it. `/ops` carries the **Centralization
Inventory** + the sovereign **Telemetry** switch. Other views (doctrine,
gateway, truth-chain, truth-coin, reclaim, 7th-dimension) are siblings
under `src/routes/`.

## Sovereign deploy (IPFS)

The build output can be pinned to your own IPFS node. There is intentionally
no managed pinning service in the loop.

```bash
bun run build
node scripts/pin-ipfs.mjs            # requires Kubo `ipfs` on PATH
# → bafy…cid printed on stdout
```

To publish a stable name, use **your** IPNS key or an ENS contenthash:

```bash
ipfs name publish --key=cmap /ipfs/<cid>
# or: from your wallet, set ENS contenthash → ipfs://<cid>
```

Custom domain (`cosmic-mesh.dev`) → DNSLink TXT record on `_dnslink`
pointing at the IPNS hash. The script never asks for a third-party API
key; if a service is in the path, it is your node, your key, your name.

## Contract

`contracts/` holds the Hardhat scaffold for `TruthCoin.sol` (TRC). The
local deploy path requires **no wallet, no faucet, no network** — run
`npm run deploy:local` inside `contracts/` and the contract deploys to an
in-memory node with a built-in funded signer. See `contracts/HARDHAT.md`
for the full path from local proof to Base Sepolia live deployment.

## Audit status (Sherlock engagement)

The audit scope is a single frozen file, not a moving branch.

```
Bundle  : docs/truthcoin-audit-bundle.txt
SHA-256 : 8f21bb6e58e67ef925170b39b66d9bb78c2f416553919a0c57b8cb7509809a30
OTS     : Bitcoin block 959472  (docs/truthcoin-audit-bundle.ots)
```

- Scope, invariants, deliverables → [`docs/AUDIT-TRANSMITTAL.md`](docs/AUDIT-TRANSMITTAL.md)
- Governance and upgrade logic → [`POLICY-OF-INTENT.md`](POLICY-OF-INTENT.md)
- Auditor index → [`docs/README.md`](docs/README.md)

Reproduce the hardened state:

```bash
cd contracts && npm install && npm run preflight   # exits 0 on a hardened tree
node scripts/substrate-snapshot.mjs                 # prints the substrate root
```

No mainnet deployment exists. The only live deployment is Base Sepolia
`0x85b1C3c32B4Da3203b3B3c3B670Cb90e67410b78`. `mainnetGateOpen()` stays `false`
until the Safe multisig and the audit report are both recorded with verifiable
evidence.

### Repository layout for reviewers

| Path | Contents |
|------|----------|
| `contracts/` | `src/TruthCoin.sol`, tests, deploy/preflight/Safe-handoff scripts |
| `src/lib/` | Hardened verification logic — `signed-envelope.ts` + `signed-envelope.test.ts` |
| `scripts/` | `substrate-snapshot.mjs` — deterministic substrate root derivation |
| `docs/` | Transmittal, audit bundle, OTS receipt, auditor index |


## Pass log

- **Pass 1** Doctrine Audit (`/pam`) — UI claims ↔ in-browser evidence.
- **Pass 2** Centralization Inventory (`/ops`) — every non-sovereign dep
  named honestly with its concrete sovereignty path.
- **Pass 3** IPFS deploy helper (`scripts/pin-ipfs.mjs`) — operator-only,
  Kubo-backed, no managed service.
- **Pass 4** IndexedDB-backed sovereign store + opt-in telemetry switch
  (default OFF; PostHog stays available but inert until flipped on).

