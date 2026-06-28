import { Link } from "@tanstack/react-router";
import type { Blade } from "@/data/blades";

export function BladeStandby({ blade, children }: { blade: Blade; children?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-12">
      <header className="space-y-3 border-b border-border pb-6">
        <div className="flex items-baseline justify-between gap-4">
          <div className="text-[0.7rem] uppercase tracking-[0.22em] text-gold">
            OMNI-SAM AXIS · BLADE {blade.n}
          </div>
          <Link to="/" className="text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground hover:text-gold">
            ← axis
          </Link>
        </div>
        <h1 className="font-display text-3xl tracking-[0.1em] text-foreground">
          <span className="text-gold">{blade.glyph}</span>&nbsp; {blade.name}
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{blade.tagline}</p>
        <StatusBadge status={blade.status} />
      </header>

      <section className="rounded border border-border bg-card/40 p-6">
        <div className="text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground">
          {blade.status === "AWAITING" ? "awaiting feed" : "standby"}
        </div>
        <p className="mt-2 text-sm text-foreground">
          {blade.awaiting ?? "This blade is registered in the axis but holds no operational surface yet."}
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          No mock data. No vendor middleware. Promotion to LIVE requires a real
          signal, not a placeholder.
        </p>
      </section>

      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: Blade["status"] }) {
  const cls =
    status === "LIVE"
      ? "border-gold text-gold"
      : status === "AWAITING"
      ? "border-destructive/60 text-destructive"
      : "border-border text-muted-foreground";
  return (
    <span className={`inline-block rounded border px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-[0.2em] ${cls}`}>
      {status}
    </span>
  );
}
