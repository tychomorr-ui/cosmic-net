import { Link } from "@tanstack/react-router";
import { BLADES, type Blade } from "@/data/blades";

export function AxisGrid() {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-[0.7rem] uppercase tracking-[0.22em] text-gold">
          ⟁ OMNI-SAM AXIS · ALPHA · 01
        </div>
        <div className="text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground">
          13 BLADES · MONARCH · ORE · ◬ · ◇
        </div>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {BLADES.map((b) => (
          <BladeTile key={b.n} blade={b} />
        ))}
      </ul>
    </section>
  );
}

function BladeTile({ blade }: { blade: Blade }) {
  const accent =
    blade.status === "LIVE"
      ? "border-gold/60 hover:border-gold"
      : blade.status === "AWAITING"
      ? "border-destructive/40 hover:border-destructive"
      : "border-border hover:border-gold/60";
  return (
    <li>
      <Link
        to={blade.route}
        className={`group block h-full rounded border bg-card/40 p-4 transition ${accent}`}
      >
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-lg text-gold">{blade.glyph}</span>
            <span className="font-display text-sm tracking-[0.12em] text-foreground">
              {blade.name}
            </span>
          </div>
          <span className="font-mono text-[0.65rem] text-muted-foreground">
            {blade.n}
          </span>
        </div>
        <p className="mt-2 text-[0.7rem] leading-relaxed text-muted-foreground">
          {blade.tagline}
        </p>
        <div className="mt-3 flex items-center justify-between">
          <StatusPill status={blade.status} />
          <span className="font-mono text-[0.65rem] text-muted-foreground transition group-hover:text-gold">
            {blade.route} →
          </span>
        </div>
      </Link>
    </li>
  );
}

function StatusPill({ status }: { status: Blade["status"] }) {
  const cls =
    status === "LIVE"
      ? "border-gold/60 text-gold"
      : status === "AWAITING"
      ? "border-destructive/60 text-destructive"
      : "border-border text-muted-foreground";
  return (
    <span
      className={`rounded border px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.2em] ${cls}`}
    >
      {status}
    </span>
  );
}
