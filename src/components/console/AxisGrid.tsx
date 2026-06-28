import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { BLADES, type Blade } from "@/data/blades";
import { useBladeNav } from "@/lib/use-blade-nav";

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
  const nav = useBladeNav();
  const [pending, setPending] = useState(false);
  const accent =
    blade.status === "LIVE"
      ? "border-gold/60 hover:border-gold"
      : blade.status === "AWAITING"
      ? "border-destructive/40 hover:border-destructive"
      : "border-border hover:border-gold/60";

  const body = (
    <>
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
        <StatusPill status={pending ? "PENDING" : blade.status} />
        <span className="font-mono text-[0.65rem] text-muted-foreground transition group-hover:text-gold">
          {blade.route} →
        </span>
      </div>
    </>
  );

  const cls = `group block h-full w-full rounded border bg-card/40 p-4 text-left transition ${accent}`;

  if (blade.status === "AWAITING") {
    return (
      <li>
        <button
          type="button"
          className={cls}
          onClick={async (e) => {
            setPending(true);
            await nav(blade, e);
            // brief visual hold then release
            setTimeout(() => setPending(false), 1200);
          }}
          aria-label={`${blade.name} — awaiting; click logs STANCE_PENDING to Truth Ledger`}
        >
          {body}
        </button>
      </li>
    );
  }

  return (
    <li>
      <Link to={blade.route as "/"} className={cls}>
        {body}
      </Link>
    </li>
  );
}

function StatusPill({ status }: { status: Blade["status"] | "PENDING" }) {
  const cls =
    status === "LIVE"
      ? "border-gold/60 text-gold"
      : status === "AWAITING"
      ? "border-destructive/60 text-destructive"
      : status === "PENDING"
      ? "border-primary/60 text-primary"
      : "border-border text-muted-foreground";
  const label = status === "PENDING" ? "STANCE_PENDING" : status;
  return (
    <span
      className={`rounded border px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.2em] ${cls}`}
    >
      {label}
    </span>
  );
}
