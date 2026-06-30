import { useMemo } from "react";
import { computeRegistry, readinessSummary, type ReadinessState } from "@/lib/blade-readiness";

const STATE_STYLE: Record<ReadinessState, string> = {
  READY:     "border-gold text-gold",
  REACHABLE: "border-gold/40 text-gold/80",
  RENDERED:  "border-border text-foreground",
  AWAITING:  "border-muted-foreground/40 text-muted-foreground",
  DOCTRINE:  "border-muted-foreground/30 text-muted-foreground",
  PURGED:    "border-destructive/50 text-destructive",
};

export function BladeReadinessRegistry() {
  const rows = useMemo(() => computeRegistry(), []);
  const sum = useMemo(() => readinessSummary(rows), [rows]);

  return (
    <section className="space-y-4 rounded border border-border bg-card/40 p-5">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <div className="text-[0.65rem] uppercase tracking-[0.22em] text-gold">
            Blade Readiness Registry
          </div>
          <h2 className="font-display text-lg tracking-[0.08em] text-foreground">
            13 blades · ARCHANGEL/v0 coupling
          </h2>
        </div>
        <div className="font-mono text-[0.65rem] text-muted-foreground">
          source: <span className="text-foreground">src/data/terminus-ops.json</span>
        </div>
      </header>

      <p className="max-w-3xl text-xs text-muted-foreground">
        READY is reserved for blades whose bound node returned a valid
        ARCHANGEL/v0 envelope (signed-status probe, ed25519 verified). UI-only
        blades render but have no node to verify — they report{" "}
        <span className="text-foreground">RENDERED</span>, not READY. Purged
        blades stay purged; no theater promotion.
      </p>

      <div className="grid grid-cols-2 gap-2 font-mono text-[0.65rem] sm:grid-cols-6">
        {(["READY", "REACHABLE", "RENDERED", "AWAITING", "DOCTRINE", "PURGED"] as const).map((k) => (
          <div key={k} className={`rounded border px-2 py-1.5 text-center ${STATE_STYLE[k]}`}>
            <div className="uppercase tracking-[0.18em]">{k.toLowerCase()}</div>
            <div className="mt-0.5 font-display text-base">{sum[k]}</div>
          </div>
        ))}
      </div>

      <ol className="space-y-1.5">
        {rows.map((r) => (
          <li
            key={r.blade.n}
            className="grid grid-cols-[2.2rem_1fr_auto] items-center gap-3 rounded border border-border bg-background/40 px-3 py-2"
          >
            <span className="font-mono text-[0.7rem] text-muted-foreground">
              <span className="text-gold">{r.blade.glyph}</span> {r.blade.n}
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm text-foreground">{r.blade.name}</div>
              <div className="truncate font-mono text-[0.65rem] text-muted-foreground">
                {r.node ? `node: ${r.node.id}` : "no node coupling"}
                {r.probe?.payload_cid && (
                  <> · cid <span className="text-foreground">{r.probe.payload_cid.slice(0, 12)}…</span></>
                )}
                {" · "}{r.reason}
              </div>
            </div>
            <span
              className={`rounded border px-2 py-0.5 font-mono text-[0.62rem] uppercase tracking-[0.18em] ${STATE_STYLE[r.state]}`}
            >
              {r.state.toLowerCase()}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
