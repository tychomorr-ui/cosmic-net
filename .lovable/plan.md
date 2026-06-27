## Scope

Add a single new route, `/reclaim`, that renders the Project Reclaim content you pasted, verbatim, inside the existing Terminus shell (ticker, uplink strip, footer). No new data layer, no metrics fabrication, no county form handler — partner CTAs link out / are marked STANDBY.

## Route

`src/routes/reclaim.tsx` with `head()`:

- title: "Project Reclaim · Nexinus Terminus"
- description: "Wildfire prevention and rehabilitation infrastructure — restore the land, restore the people."
- og:title / og:description mirror the above
- no og:image (none meaningful yet)

Nav: add a "Reclaim" link in `src/components/shell/UplinkStrip.tsx` alongside Witness · Truth Point · Truth Coin · Ops.

## Page sections (in order, copy stays verbatim)

1. **Hero** — eyebrow "Wildfire Prevention & Rehabilitation", H1 "Restore the Land. Restore the People.", lede paragraph.
2. **Four metric tiles** — Target Acreage / Crew Positions / Timber Recovered / Re-entry Rate. Values rendered as em-dash placeholders with the verbatim "Defined at program launch" / "Reported per operational season" / "Tracked from cohort one" subtitles. No fabricated numbers.
3. **Program Architecture · Six Pillars of Reclaim** — section header.
4. **Mission** — two-paragraph block.
5. **Five pillar cards** (the source lists 5 named pillars under the "Six Pillars" header — kept verbatim; the sixth slot is rendered as an explicit "PILLAR 06 · STANDBY · Defined at program launch" card so the count matches the header honestly):
   - Forestry Restoration
   - Manual Milling
   - Rehabilitation Infrastructure
   - Operational Metrics
   - Application Workflow
   - (Pillar 06 — Standby)
6. **Partner with Project Reclaim** band — H2 "Is Your County Ready to Reclaim?", lede, two CTAs:
   - "Submit County Proposal" → `mailto:` placeholder marked STANDBY (no real endpoint yet)
   - "Investor Information" → same treatment
   Both rendered as outline buttons; tooltip / caption notes they're standby until a real intake URL is provided.

## Components

Small, route-local; no new shared primitives needed:

- `ReclaimHero`
- `MetricTile` (label, value="—", subtitle)
- `PillarCard` (number, title, body paragraphs)
- `PartnerBand`

All in `src/components/reclaim/`.

## Visual direction

Reuse existing tokens: obsidian background, gold accent for eyebrows + section markers, JetBrains Mono for metric labels and pillar numbers, Cinzel for H1/H2. Pillars rendered as a single-column stack on mobile, 2-up on `md`, 3-up on `lg`, with thin border-border dividers — same austerity as Truth Point cards.

## File map

```text
src/
  routes/reclaim.tsx
  components/reclaim/
    ReclaimHero.tsx
    MetricTile.tsx
    PillarCard.tsx
    PartnerBand.tsx
  components/shell/UplinkStrip.tsx    ← add Reclaim link
```

## Out of scope

- No county-proposal form, no DB writes, no email send. CTAs are visual + standby labels.
- No fabricated acreage / cohort / re-entry numbers; tiles stay em-dash.
- No new images. No XinUS MonarchOS dashboard preview (referenced in copy but treated as a textual claim, not a live embed).
- No changes to existing routes, ticker, footer, or probes.

## Done means

- `/reclaim` renders all six sections without console errors; typecheck clean.
- Nav highlights "Reclaim" when on the route.
- Every numeric tile shows "—"; no synthetic metrics anywhere on the page.
- Pillar 06 standby card is present and labeled, so the "Six Pillars" header matches what's shown.
