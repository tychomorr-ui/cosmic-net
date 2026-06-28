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

- TanStack Start v1 (React 19, Vite 7) on Cloudflare Workers.
- Tailwind v4 (`src/styles.css`), shadcn primitives.
- `@cosmic-mesh/protocol` — frozen ARCHANGEL/v0 wire contract shared with
  the Go `archangel` daemon under `node-daemon/`.
- PostHog (`src/lib/posthog.ts`) — direct to `us.posthog.com`, every event
  carries `protocol: "cMAP"` for downstream filtering.

## Routes

`/` is the unified console (uplink, tesseract projection, 13-blade AXIS).
Doctrine, gateway, fleet, ops, truth-coin, reclaim, and 7th-dimension
views are siblings under `src/routes/`.
