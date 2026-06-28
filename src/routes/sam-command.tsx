import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { BLADES } from "@/data/blades";
import { useTickerEvents, type TickerEvent } from "@/lib/probe-store";

const BLADE = BLADES.find((b) => b.n === "08")!;

export const Route = createFileRoute("/sam-command")({
  head: () => ({
    meta: [
      { title: `${BLADE.name} · Blade ${BLADE.n}` },
      { name: "description", content: BLADE.tagline },
    ],
  }),
  component: SamCommand,
});

function SamCommand() {
  const events = useTickerEvents();
  const stats = useMemo(() => summarize(events), [events]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <header className="space-y-3 border-b border-border pb-6">
        <div className="flex items-baseline justify-between gap-4">
          <div className="text-[0.7rem] uppercase tracking-[0.22em] text-gold">
            OMNI-SAM AXIS · BLADE {BLADE.n}
          </div>
          <Link to="/" className="text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground hover:text-gold">
            ← axis
          </Link>
        </div>
        <h1 className="font-display text-3xl tracking-[0.1em] text-foreground">
          <span className="text-gold">{BLADE.glyph}</span>&nbsp; {BLADE.name}
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Time-series command surface. Bounded 64-event sliding window over the
          Archangel probe ticker. No vendor scrape, no Prometheus dependency —
          this is the same signal the Uplink emits, rendered as a series.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-4">
        <Stat label="events" value={events.length} />
        <Stat label="measured" value={stats.measured} accent />
        <Stat label="reachable" value={stats.reachable} />
        <Stat label="unreachable" value={stats.unreachable} destructive />
      </section>

      <section className="space-y-2">
        <div className="text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground">
          series · newest first
        </div>
        <Spark events={events} />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse font-mono text-[0.7rem]">
            <thead>
              <tr className="border-b border-border text-left text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
                <th className="py-2 pr-3">#</th>
                <th className="py-2 pr-3">ts</th>
                <th className="py-2 pr-3">tag</th>
                <th className="py-2 pr-3">state</th>
                <th className="py-2">detail</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 ? (
                <tr><td colSpan={5} className="py-3 text-muted-foreground">awaiting first probe…</td></tr>
              ) : events.map((e) => (
                <tr key={e.id} className="border-b border-border/40">
                  <td className="py-1.5 pr-3 text-muted-foreground">{e.id}</td>
                  <td className="py-1.5 pr-3 text-foreground">{new Date(e.ts).toISOString().slice(11, 19)}Z</td>
                  <td className="py-1.5 pr-3 text-foreground">{e.tag}</td>
                  <td className={`py-1.5 pr-3 ${stateColor(e.state)}`}>{e.state.toUpperCase()}</td>
                  <td className="py-1.5 text-muted-foreground">{e.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function summarize(events: TickerEvent[]) {
  let measured = 0, reachable = 0, unreachable = 0;
  for (const e of events) {
    if (e.state === "measured") measured++;
    else if (e.state === "reachable") reachable++;
    else if (e.state === "unreachable") unreachable++;
  }
  return { measured, reachable, unreachable };
}

function stateColor(s: TickerEvent["state"]) {
  switch (s) {
    case "measured": return "text-gold";
    case "reachable": return "text-foreground";
    case "unreachable": return "text-destructive";
    case "probing": return "text-muted-foreground";
    default: return "text-muted-foreground";
  }
}

function Stat({ label, value, accent, destructive }: { label: string; value: number; accent?: boolean; destructive?: boolean }) {
  const cls = accent ? "text-gold" : destructive ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded border border-border bg-card/40 p-3">
      <div className="text-[0.6rem] uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
      <div className={`mt-1 font-mono text-2xl ${cls}`}>{value}</div>
    </div>
  );
}

function Spark({ events }: { events: TickerEvent[] }) {
  // Newest first → reverse for left→right time order.
  const ordered = [...events].reverse();
  const W = 640, H = 48, slot = ordered.length > 0 ? W / ordered.length : W;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-12 w-full border border-border bg-card/30">
      {ordered.map((e, i) => {
        const y = e.state === "measured" ? 6
          : e.state === "reachable" ? 18
          : e.state === "unreachable" ? 40
          : 28;
        const color = e.state === "measured" ? "currentColor"
          : e.state === "unreachable" ? "currentColor"
          : "currentColor";
        const cls = e.state === "measured" ? "text-gold"
          : e.state === "unreachable" ? "text-destructive"
          : e.state === "reachable" ? "text-foreground"
          : "text-muted-foreground";
        return (
          <rect
            key={e.id}
            x={i * slot}
            y={y}
            width={Math.max(1, slot - 1)}
            height={H - y - 2}
            className={cls}
            fill={color}
            opacity={0.85}
          />
        );
      })}
    </svg>
  );
}
