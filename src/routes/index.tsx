import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nexinus Terminus · Sovereign Witness" },
      { name: "description", content: "A sovereign witness console for the Nexinus mesh: doctrine-gated nodes, direct browser probes, and Bitcoin-anchored provenance." },
      { property: "og:title", content: "Nexinus Terminus · Sovereign Witness" },
      { property: "og:description", content: "Witness, not control. The Terminus shell for the Nexinus sovereign mesh." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <section className="grid gap-10 md:grid-cols-[1.4fr_1fr] md:items-end">
        <div>
          <div className="text-[0.7rem] uppercase tracking-[0.2em] text-gold">Terminus · witness layer</div>
          <h1 className="mt-3 font-display text-4xl leading-tight text-foreground sm:text-5xl">
            Witness, not control.<br />
            <span className="text-gold">Measured</span> over <span className="text-[color:var(--attested)]">attested</span> over <span className="text-[color:var(--doctrine)]">doctrine</span>.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            The Nexinus Terminus is a sovereign console for observing the mesh. It refuses to fabricate liveness.
            Every claim on this site is labeled by its evidence tier: directly measured from this browser,
            attested by the operator but unverified here, or pure doctrine awaiting infrastructure.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/truth-point" className="border border-gold bg-gold/10 px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-gold hover:bg-gold/20">
              Truth Point ◆ verification matrix
            </Link>
            <Link to="/truth-coin" className="border border-border bg-card/40 px-5 py-2.5 text-xs uppercase tracking-[0.2em] text-foreground hover:border-gold">
              Truth Coin ◆ doctrine
            </Link>
          </div>
        </div>
        <aside className="border border-border bg-card/40 p-5 text-xs leading-relaxed text-muted-foreground">
          <div className="text-[0.7rem] uppercase tracking-[0.18em] text-gold">Posture</div>
          <ul className="mt-3 space-y-2 text-foreground/85">
            <li>◆ Zero mock telemetry. Empty is honest.</li>
            <li>◆ Direct browser probes only — no proxy laundering.</li>
            <li>◆ Doctrine never displays as MEASURED.</li>
            <li>◆ Bitcoin-anchored provenance for the Truth Coin doctrine.</li>
          </ul>
        </aside>
      </section>
    </div>
  );
}
