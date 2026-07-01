import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  computeRegistry,
  readinessSummary,
  type ProbeFacts,
  type ReadinessState,
} from "@/lib/blade-readiness";
import { NODES } from "@/data/nodes";
import { probeSignedStatus } from "@/lib/probe-signed";
import { probeCorsJson, probeOpaqueHead, type ProbeStatus } from "@/lib/probes";

const STATE_STYLE: Record<ReadinessState, string> = {
  READY:     "border-gold text-gold",
  REACHABLE: "border-gold/40 text-gold/80",
  RENDERED:  "border-border text-foreground",
  AWAITING:  "border-muted-foreground/40 text-muted-foreground",
  DOCTRINE:  "border-muted-foreground/30 text-muted-foreground",
  PURGED:    "border-destructive/50 text-destructive",
};

const BOUND_NODE_IDS = ["resonate-earth", "xinus-monarch", "xinus-valkyrie"];

function toFacts(nodeId: string, s: ProbeStatus): ProbeFacts {
  const map: Record<ProbeStatus["state"], ProbeFacts["state"]> = {
    idle: "UNKNOWN",
    probing: "UNKNOWN",
    measured: "MEASURED",
    reachable: "REACHABLE",
    unreachable: "UNREACHABLE",
  };
  const detail = "detail" in s ? s.detail : "";
  const ts = "at" in s ? new Date(s.at).toISOString() : new Date().toISOString();
  return { nodeId, state: map[s.state], detail, ts };
}

async function runProbe(nodeId: string): Promise<ProbeFacts> {
  const node = NODES.find((n) => n.id === nodeId);
  if (!node?.probe) {
    return { nodeId, state: "UNKNOWN", detail: "no probe declared", ts: new Date().toISOString() };
  }
  const p = node.probe;
  let s: ProbeStatus;
  if (p.kind === "signed-status" && p.edPubHex) {
    s = await probeSignedStatus(p.url, p.edPubHex);
  } else if (p.kind === "cors-json") {
    s = await probeCorsJson(p.url, p.okField);
  } else {
    s = await probeOpaqueHead(p.url);
  }
  return toFacts(nodeId, s);
}

export function BladeReadinessRegistry() {
  const [overrides, setOverrides] = useState<Map<string, ProbeFacts>>(new Map());
  const [busy, setBusy] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);

  const rows = useMemo(() => computeRegistry(overrides), [overrides]);
  const sum = useMemo(() => readinessSummary(rows), [rows]);

  const reverify = useCallback(async () => {
    setBusy(true);
    const t = toast.loading("Re-verifying blade coupling…", {
      description: `Probing ${BOUND_NODE_IDS.length} bound nodes against ARCHANGEL/v0`,
    });
    try {
      const results = await Promise.all(BOUND_NODE_IDS.map(runProbe));
      const next = new Map<string, ProbeFacts>();
      for (const r of results) next.set(r.nodeId, r);
      setOverrides(next);
      setLastRun(new Date().toISOString());
      const ready = results.filter((r) => r.state === "MEASURED").length;
      const reach = results.filter((r) => r.state === "REACHABLE").length;
      const unreach = results.filter((r) => r.state === "UNREACHABLE").length;
      toast.success(`Re-verified · ${ready} ready · ${reach} reachable · ${unreach} unreachable`, {
        id: t,
        description: results
          .map((r) => `${r.nodeId}: ${r.state.toLowerCase()}`)
          .join(" · "),
      });
    } catch (e) {
      toast.error("Re-verification failed", {
        id: t,
        description: e instanceof Error ? e.message : "unknown error",
      });
    } finally {
      setBusy(false);
    }
  }, []);

  const clearOverrides = () => {
    setOverrides(new Map());
    setLastRun(null);
    toast("Cleared live probes · reverted to terminus-ops.json");
  };

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
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-mono text-[0.6rem] text-muted-foreground">
            {lastRun ? (
              <>live probe · {new Date(lastRun).toLocaleTimeString()}</>
            ) : (
              <>source: <span className="text-foreground">terminus-ops.json</span></>
            )}
          </div>
          {overrides.size > 0 && (
            <button
              onClick={clearOverrides}
              className="border border-border px-2 py-1 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
            >
              clear
            </button>
          )}
          <button
            onClick={() => void reverify()}
            disabled={busy}
            className="border border-gold px-3 py-1 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-gold hover:bg-gold/10 disabled:opacity-50"
          >
            {busy ? "re-verifying…" : "re-verify blades"}
          </button>
        </div>
      </header>

      <p className="max-w-3xl text-xs text-muted-foreground">
        READY is reserved for blades whose bound node returned a valid
        ARCHANGEL/v0 envelope (signed-status probe, ed25519 verified). UI-only
        blades render but have no node to verify — they report{" "}
        <span className="text-foreground">RENDERED</span>, not READY. Purged
        blades stay purged; no theater promotion. Re-verify runs the same
        probes against the three bound nodes (Monarch · Valkyrie · Resonate-Earth)
        and overlays the results — no server proxy, no telemetry.
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
