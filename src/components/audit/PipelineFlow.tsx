// Anchor · Verify · Display — single visual flow over every receipt.
// Reads runPipeline() and renders the four stages with honest counts and
// per-row reasons. No fake greens; rows broadcast exactly why they sit
// where they sit.

import { useEffect, useMemo, useState } from "react";
import { runPipeline, type PipelineResult, type PipelineStage } from "@/lib/pipeline";
import { subscribeAnchors } from "@/lib/anchors";

const STAGE_LABEL: Record<PipelineStage, string> = {
  stamped: "STAMPED",
  anchored: "ANCHORED",
  verified: "VERIFIED",
  broken: "BROKEN",
};

const STAGE_TONE: Record<PipelineStage, string> = {
  stamped: "text-gold border-gold/40",
  anchored: "text-foreground border-foreground/30",
  verified: "text-[color:var(--measured)] border-[color:var(--measured)]/40",
  broken: "text-destructive border-destructive/40",
};

export function PipelineFlow() {
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [filter, setFilter] = useState<PipelineStage | "ALL">("ALL");
  const [busy, setBusy] = useState(false);

  const refresh = useMemo(
    () => async () => {
      setBusy(true);
      try {
        setResult(await runPipeline());
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  useEffect(() => {
    void refresh();
    const off = subscribeAnchors(() => void refresh());
    const t = setInterval(() => void refresh(), 30_000);
    return () => {
      off();
      clearInterval(t);
    };
  }, [refresh]);

  const items = useMemo(() => {
    if (!result) return [];
    return filter === "ALL" ? result.items : result.items.filter((i) => i.stage === filter);
  }, [result, filter]);

  return (
    <section className="border border-border bg-card/30 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="text-[0.7rem] uppercase tracking-[0.18em] text-gold">
            Anchor · Verify · Display
          </div>
          <h3 className="mt-2 font-display text-lg text-foreground">
            One pipeline · every receipt walks the same four stages
          </h3>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={busy}
          className="border border-border px-2 py-1 text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground hover:text-gold disabled:opacity-50"
        >
          {busy ? "running" : "rerun"}
        </button>
      </div>

      {result && (
        <>
          <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-4">
            <Tile label="Stamped" value={result.summary.stamped} tone="stamped" />
            <Tile label="Anchored" value={result.summary.anchored} tone="anchored" />
            <Tile label="Verified" value={result.summary.verified} tone="verified" />
            <Tile label="Broken" value={result.summary.broken} tone="broken" />
          </dl>

          <div className="mt-4 grid gap-2 border-t border-border pt-4 text-xs sm:grid-cols-2">
            <div>
              <div className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
                Golden Truth CID · coupling {result.summary.coupling}
              </div>
              <div className="mt-1 break-all font-mono text-[0.7rem] text-foreground">
                {result.summary.golden_truth_cid}
              </div>
            </div>
            <div>
              <div className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
                Manifest payload_cid
              </div>
              <div className="mt-1 break-all font-mono text-[0.7rem] text-foreground">
                {result.summary.manifest_payload_cid}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-1">
            {(["ALL", "verified", "anchored", "stamped", "broken"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`border px-2 py-1 text-[0.6rem] uppercase tracking-[0.18em] ${
                  filter === f
                    ? "border-gold text-gold"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "ALL" ? `ALL · ${result.summary.total}` : f}
              </button>
            ))}
          </div>

          <ul className="mt-3 max-h-[28rem] space-y-1 overflow-auto pr-1">
            {items.map((i) => (
              <li
                key={i.sha256}
                className={`flex flex-wrap items-start justify-between gap-2 border bg-background/60 p-3 ${STAGE_TONE[i.stage]}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-[0.6rem] uppercase tracking-[0.18em]">
                    <span className="border border-border px-2 py-0.5 text-foreground">
                      {i.subsystem}
                    </span>
                    <span className="font-mono normal-case tracking-normal text-foreground/70">
                      {i.command}
                    </span>
                  </div>
                  <div className="mt-1 break-all font-mono text-[0.65rem] text-foreground">
                    {i.sha256}
                  </div>
                  <div className="mt-1 font-mono text-[0.6rem] text-muted-foreground">
                    {i.reason}
                  </div>
                </div>
                <span className="text-[0.6rem] uppercase tracking-[0.18em]">
                  {STAGE_LABEL[i.stage]}
                </span>
              </li>
            ))}
            {items.length === 0 && (
              <li className="font-mono text-[0.65rem] text-muted-foreground">
                no rows at this stage
              </li>
            )}
          </ul>
        </>
      )}
    </section>
  );
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: PipelineStage;
}) {
  return (
    <div className={`border bg-background/60 p-3 ${STAGE_TONE[tone]}`}>
      <div className="text-[0.6rem] uppercase tracking-[0.18em]">{label}</div>
      <div className="mt-1 font-mono text-lg">{value}</div>
    </div>
  );
}
