
# cMAP Sovereignty Migration — Staged Plan

Goal: make cMAP infrastructure-independent (no Hetzner, no always-on backend) **without** breaking the current build or making un-cryptographic claims in the UI. Work is staged so each pass is independently shippable and reversible.

## Current reality (audit, before any code changes)

- Frontend is TanStack Start running on a Cloudflare Worker (`src/server.ts`, `src/start.ts`). It is **not** hosted on Hetzner. The only Hetzner-shaped surface is the **node-daemon** (`archangel`) the operator deploys per node, plus probes against `monarch.xinus.one`, `valkyrie.xinus.one`, `resonate-earth.live`.
- There are **no app-internal server functions** that hold secrets. All "backend" calls in the running app are direct browser → node HTTP/HEAD probes (see network log).
- PostHog is the one centralized dependency baked into the client.
- "Truth Chain" state already lives in `localStorage`; CIDs are already content-addressed via `@ipld/dag-json` + `multiformats`.

So the migration is mostly: (a) prove the above in the UI, (b) make the static bundle IPFS-deployable, (c) name the centralized pieces honestly instead of removing things that were never there.

## Pass 1 — Verifiability Audit (UI ↔ doctrine)

Cross-reference every user-visible claim against what the code can actually prove in-browser. Three categories:

1. **Provable now** — leave as-is, add a `verify` affordance if missing (CID recompute, HEAD reach, signature check).
2. **Aspirational** — re-label with an `UNVERIFIED` / `DECLARED` sigil so the UI never overstates the mesh state.
3. **Drift** — fix the string.

Deliverable: `src/lib/doctrine-audit.ts` exporting a typed list of `{ surface, claim, evidence, status }`, rendered at `/pam` under a new "Doctrine Audit" panel. No silent renames.

## Pass 2 — Honest centralization inventory

Add `src/lib/centralization-inventory.ts` enumerating every non-sovereign dependency the running app actually has:

- PostHog (`us.i.posthog.com`) — analytics, optional.
- Google Fonts CDN — typography, replaceable with self-hosted woff2 in `public/`.
- `monarch.xinus.one`, `valkyrie.xinus.one`, `resonate-earth.live` — probe targets.
- Cloudflare Worker SSR host — currently serves the bundle.

Surface this inventory at `/ops` so the user (and any auditor) can see exactly what would have to move before "infrastructure-independent" is a true statement.

## Pass 3 — IPFS-ready static build

Make the bundle deployable to IPFS without breaking the current Worker deploy.

- Add `bun run build:static` that runs Vite in SPA mode (no SSR), emits `dist-static/` with **relative** asset paths (`base: './'`) so it works under any IPFS gateway path prefix.
- Move the SSR-only bits (`src/server.ts`, `src/start.ts`, `routes/api/*` if any) out of the static graph via a conditional entry.
- Self-host the two Google Fonts (`VT323`, `Major Mono Display`, `JetBrains Mono`) into `public/fonts/` and switch `__root.tsx` to a local `<link>` so the static bundle has zero third-party font fetches.
- Add `scripts/pin-ipfs.mjs` — takes `dist-static/`, computes a CIDv1 locally with `@helia/unixfs`, prints the CID, and optionally pins via a `PINATA_JWT` if the user provides one later. No secret is required for the CID computation itself.
- Document the IPNS / ENS mapping step in `README.md`. We do **not** auto-publish IPNS; that requires a key the user must hold.

This pass leaves the Worker deploy intact. IPFS becomes an additional, equally valid distribution channel.

## Pass 4 — Frontend-only state hardening

- Move `truth-chain` and `truth-ledger` from `localStorage` to **IndexedDB** via a thin `idb-keyval` wrapper, keeping the existing key shape. localStorage stays as a read-through fallback for one release so no operator loses their chain.
- Replace the PostHog client with an **opt-in** local-only event log written to IndexedDB, gated behind a `cMAP · telemetry` toggle that defaults to OFF. PostHog stays removable in one commit; we don't silently keep it.
- Document (not implement) the libp2p peer-discovery direction. Bundling js-libp2p into a static SPA is a real piece of work and should be its own plan once the IPFS distribution is live.

## What this plan does NOT do

- Does not claim to remove Hetzner from anywhere it isn't. The Worker host is Cloudflare; the node-daemon is operator-chosen.
- Does not auto-publish to IPNS or buy an ENS name — both need keys/funds only the user holds.
- Does not bundle libp2p yet; that is Pass 5 once Passes 1–4 are shipped.

## Decisions I need from you before I start

1. **PostHog**: remove entirely, or keep as opt-in local-only (Pass 4)?
2. **Fonts**: self-host the three Google Fonts now, or defer until Pass 3 ships?
3. **Pinning**: do you want `scripts/pin-ipfs.mjs` wired to Pinata (needs a JWT secret later) or kept gateway-agnostic (CID only, you pin manually)?
4. Approve staged shipping (Pass 1 first), or want all four passes in one batch?
