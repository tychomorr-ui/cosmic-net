## Reality check

The project today is empty: `src/routes/index.tsx` is still the Lovable placeholder, and the only real code I've added is the Inngest wiring (`/api/inngest`, four functions, `sendInngestEvent`). None of the "9 blades", node roster, ed25519 fulcrum, Observatory, or PAM described in earlier turns has actually been built. Before adding more surface area, this plan ports the two concrete pages you keep pasting — Truth Point and Truth Coin — onto a real Terminus shell, with live probes for the two nodes that actually answer (Monarch, Valkyrie).

## Scope (this plan only)

1. **Terminus shell** — `src/components/shell/` with `TickerBar`, `UplinkStrip`, `Footer`. Renders in `__root.tsx` around `<Outlet />`. The ticker shows the verbatim chips you pasted (Archangel, Travel Guardian, KetherGate, Valkyrie, Helsinki·Singapore·Falkenstein, recursion depth, etc.). Uplink shows UTC + active gateway.
2. **`/` (index)** — replace placeholder with a brief landing: ecosystem statement, link cards to `/truth-point` and `/truth-coin`. Per-route `head()` metadata.
3. **`/truth-point`** — verification matrix, faithful to the dump:
   - Legend: MEASURED / ATTESTED · UNVERIFIED / DOCTRINE · INTENT with the exact prose you pasted.
   - Tally strip (counts derived from current state, not hardcoded).
   - Seven node cards: Tesseract-A, Helsinki Vertex (doctrine placeholder), XinUS-Lens, Xinus-Monarch, XINUS-Valkyrie, Terminus-Tesseractus, East Coast Relay — provider, region, role, attested facts, "Truth" paragraph, all verbatim.
   - Live probe block at the bottom of each card. Browser-side probes against `https://monarch.xinus.one/health` (CORS-readable, promotes Monarch to MEASURED on `ok:true`) and a `no-cors` HEAD against `https://valkyrie.xinus.one` (opaque success ⇒ REACHABLE · HEALTH UNVERIFIED). All other nodes stay ATTESTED or DOCTRINE — no fabrication.
   - "Second witness · external telemetry" STANDBY block with the env hint `VITE_TELEMETRY_STATUS_JSON_URL`.
   - Provenance block listing the two GitHub commits (`setup.sh` cd9aeb7…, `monarch-health.sh` b866bd0…) with links to `github.com/tychomorr-ui/nexinus-bootstrap`.
4. **`/truth-coin`** — doctrine page, faithful to the dump:
   - "Pre-Issuance · Doctrine Only" banner.
   - Four "Awaiting Launch · —" stat tiles (TRC circulation, recipients, issued 24h, crystal anchored). No numbers.
   - Bottom-2% / Chokonomics / Crystal Tech / End of Fossil Fuels copy blocks.
   - Sovereign Dignity Due model card with the 1,825 × 20 + 13,500 = 50,000 TRC calculation rendered from constants (so the math is auditable, not hardcoded text).
   - Allocation Intent grid (four categories, percentages withheld).
   - Realization Path 01–06.
   - Manifesto block with the three Bitcoin anchor hashes (954160 / 954165 / 954181) and the manifesto SHA256, displayed as monospace, copy-to-clipboard.
   - "Sovereign Ledger · No Issuances Recorded" empty state.
5. **Memory** — save core design rules (Terminus austere obsidian palette, JetBrains Mono for data, Cinzel for headings, MEASURED ≠ ATTESTED ≠ DOCTRINE labeling discipline, zero-mock policy).

## Out of scope (deliberately)

- No Observatory, OODA, PAM/WebGPU, Forge, Ore, QUANTOTALUS, Proof Fulcrum routes yet — those come in follow-up plans once the shell + truth pages land.
- No ERC-20 contract deploy. The Truth Coin page documents testnet-readiness; deployment happens on the chain side, not in the app.
- No new Inngest functions. Existing four stay as-is.
- No writes to a database. Both pages render from in-repo constants + browser probes; nothing is persisted.

## Technical notes

- TanStack Start file routes: `src/routes/truth-point.tsx`, `src/routes/truth-coin.tsx`, each with its own `head()` (title, description, og:title, og:description). Update `src/routes/index.tsx` to remove the placeholder image.
- Node roster lives in `src/data/nodes.ts` as a typed array with discriminated `tier: "measured" | "attested" | "doctrine"`. The page reads from there; the live-probe layer overlays results.
- Probes in `src/lib/probes.ts` using `fetch` with `AbortController` + 4s timeout. Monarch: `mode: "cors"`, parse JSON `ok` field. Valkyrie: `mode: "no-cors"`, HEAD, opaque-success ⇒ REACHABLE. Results stored in a small React store (no library — `useSyncExternalStore` over a module-level Map). Cycle every 30s.
- Optional second witness: if `import.meta.env.VITE_TELEMETRY_STATUS_JSON_URL` is set at build, fetch + merge by hostname. Otherwise show STANDBY card verbatim.
- Fonts via `@fontsource/cinzel` and `@fontsource/jetbrains-mono` imported in `src/main.tsx`; Tailwind v4 `@theme` in `src/styles.css` for `--font-display` / `--font-mono`. Palette: `--background: oklch(0.13 0.02 270)`, `--foreground: oklch(0.92 0.01 90)`, gold accent `oklch(0.78 0.14 85)`.

```text
src/
  routes/
    __root.tsx           ← add shell + ticker around Outlet
    index.tsx            ← replace placeholder
    truth-point.tsx      ← new
    truth-coin.tsx       ← new
  components/shell/
    TickerBar.tsx
    UplinkStrip.tsx
    Footer.tsx
  components/truth-point/
    NodeCard.tsx
    TallyStrip.tsx
    SecondWitness.tsx
    ProvenanceList.tsx
  components/truth-coin/
    DoctrineHero.tsx
    AwaitingTile.tsx
    DignityModel.tsx
    RealizationPath.tsx
    Manifesto.tsx
  data/
    nodes.ts
    truth-coin.ts        ← anchors, manifesto sha, constants
  lib/
    probes.ts
    probe-store.ts
```

## Done means

- `/`, `/truth-point`, `/truth-coin` all render without console errors.
- Monarch card flips to MEASURED · ONLINE on a successful probe; Valkyrie flips to MEASURED · REACHABLE on opaque success; the other five stay in their declared tier.
- No placeholder image, no "lorem", no fabricated metrics on either page.
- Ticker, footer, and per-route SEO metadata visible on all three routes.
