import { createFileRoute } from "@tanstack/react-router";
import { ReclaimHero } from "@/components/reclaim/ReclaimHero";
import { MetricTile } from "@/components/reclaim/MetricTile";
import { PillarCard } from "@/components/reclaim/PillarCard";
import { PartnerBand } from "@/components/reclaim/PartnerBand";

export const Route = createFileRoute("/reclaim")({
  head: () => ({
    meta: [
      { title: "Project Reclaim · Nexinus Terminus" },
      {
        name: "description",
        content:
          "Wildfire prevention and rehabilitation infrastructure — restore the land, restore the people.",
      },
      { property: "og:title", content: "Project Reclaim · Nexinus Terminus" },
      {
        property: "og:description",
        content:
          "Wildfire prevention and rehabilitation infrastructure — restore the land, restore the people.",
      },
    ],
  }),
  component: Reclaim,
});

const METRICS = [
  { label: "Target Acreage", subtitle: "Defined at program launch" },
  { label: "Crew Positions", subtitle: "Defined at program launch" },
  { label: "Timber Recovered", subtitle: "Reported per operational season" },
  { label: "Re-entry Rate", subtitle: "Tracked from cohort one" },
];

const PILLARS: { number: string; title: string; body: string[]; standby?: boolean }[] = [
  {
    number: "01",
    title: "Forestry Restoration",
    body: [
      "Systematic mechanical fuel load reduction, prescribed clearing, firebreak establishment, and reforestation in high-risk zones across the American West.",
      "Crews operate with XinUS MonarchOS geospatial overlays identifying optimal intervention zones based on fuel type, terrain, wind patterns, and proximity to infrastructure.",
    ],
  },
  {
    number: "02",
    title: "Manual Milling",
    body: [
      "Salvage harvested timber is processed through mobile and fixed milling operations, converting wildfire risk into raw material for housing, fencing, and construction.",
      "Zero waste. Sustainable sourcing. Real economic output tied directly to environmental restoration activity.",
    ],
  },
  {
    number: "03",
    title: "Rehabilitation Infrastructure",
    body: [
      "Participants are current and formerly incarcerated individuals enrolled in structured work programs that provide housing, wages, certifications, and a pathway to re-entry.",
      "The model creates continuity: participants who complete programs earn forestry certifications, CDLs, chainsaw licensing, and documented employment records.",
    ],
  },
  {
    number: "04",
    title: "Operational Metrics",
    body: [
      "All Reclaim operations are tracked through the XinUS MonarchOS dashboard with real-time crew positioning, area coverage, fuel reduction metrics, and incident reporting.",
      "County and state partners receive live reporting through the Operations Dashboard — full transparency, sovereign infrastructure.",
    ],
  },
  {
    number: "05",
    title: "Application Workflow",
    body: [
      "Partner counties, conservation districts, and correctional institutions can apply directly through the Nexinus portal to enroll in the Reclaim program.",
      "Nexinus handles equipment, logistics, crew coordination, and reporting. Partners provide land access authorization and any required permits.",
    ],
  },
  {
    number: "06",
    title: "Pillar Six · Standby",
    standby: true,
    body: [
      "Reserved slot. Defined at program launch. Held open rather than back-filled with synthetic doctrine so the Six Pillars header remains honest to what is built.",
    ],
  },
];

function Reclaim() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-14">
      <ReclaimHero />

      <section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {METRICS.map((m) => (
          <MetricTile key={m.label} label={m.label} subtitle={m.subtitle} />
        ))}
      </section>

      <section className="mt-16">
        <div className="text-[0.7rem] uppercase tracking-[0.2em] text-gold">Program Architecture</div>
        <h2 className="mt-2 font-display text-3xl leading-tight text-foreground">
          Six Pillars of Reclaim
        </h2>
      </section>

      <section className="mt-8 border border-border bg-card/30 p-6 sm:p-8">
        <div className="font-mono text-[0.65rem] uppercase tracking-[0.22em] text-gold">Mission</div>
        <div className="mt-3 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Project Reclaim is Nexinus RI Systems' commitment to a parallel truth: that the land and
            the people who live on it can be restored together. Wildfire has consumed millions of
            acres. Incarceration has consumed millions of people. Both crises have a shared
            solution.
          </p>
          <p>
            Through structured labor, sovereign infrastructure, and operational continuity, Reclaim
            builds programs that restore both forest and human potential — simultaneously.
          </p>
        </div>
      </section>

      <section className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {PILLARS.map((p) => (
          <PillarCard
            key={p.number}
            number={p.number}
            title={p.title}
            body={p.body}
            standby={p.standby}
          />
        ))}
      </section>

      <PartnerBand />
    </div>
  );
}
