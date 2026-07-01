// Real-time status page — single pane of glass for fleet liveness,
// OTS anchor inclusion, and the computed Golden Truth CID. No telemetry,
// no fake greens. Every line says exactly what was measured.

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { NODES, probeTarget, type SovereignNode } from "@/data/nodes";
import { useProbeStatus } from "@/lib/probe-store";
import type { ProbeStatus } from "@/lib/probes";
import { getOverride, subscribeOverrides } from "@/lib/node-overrides";
import { subscribeAnchors } from "@/lib/anchors";
import {
  buildFinalManifest,
  type FinalManifest as ManifestT,
} from "@/lib/final-manifest";
import { PipelineFlow } from "@/components/audit/PipelineFlow";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "Live Status · Nexinus Terminus" },
      {
        name: "description",
        content:
          "Real-time fleet status: signed-status node liveness, OTS anchor inclusion, and Golden Truth CID coupling state.",
      },
      { property: "og:title", content: "Live Status · Nexinus Terminus" },
      {
        property: "og:description",
        content:
          "LIVE/UNSIGNED/BROKEN node states, anchored vs pending receipts, and the current Golden Truth CID.",
      },
    ],
  }),
  component: StatusPage,
});

// ----- node classification (mirrors MeshHealth) -----

type Tone = "live" | "unsigned" | "broken" | "doctrine" | "idle";

function classify(node: SovereignNode, s: ProbeStatus): {
  tone: Tone;
  label: string;
  detail: string;
} {
  const probe = getOverride(node.id) ?? node.probe;
  if (!probe) {
    return { tone: "doctrine", label: "DOCTRINE", detail: "no probe declared" };
  }
  if (s.state === "measured" && probe.kind === "signed-status") {
    return { tone: "live", label: "LIVE", detail: s.detail ?? "signed · cid matched" };
  }
  if (s.state === "measured") {
    return { tone: "unsigned", label: "UNSIGNED", detail: `${probe.kind} · ${s.detail}` };
  }
  if (s.state === "reachable") {
    return { tone: "unsigned", label: "UNSIGNED", detail: s.detail ?? "opaque 200" };
  }
  if (s.state === "unreachable") {
    return { tone: "broken", label: "BROKEN", detail: s.detail ?? "unreachable" };
  }
  if (s.state === "probing") {
    return { tone: "idle", label: "PROBING", detail: "in flight" };
  }
  return { tone: "idle", label: "IDLE", detail: "awaiting first probe" };
}

const TONE: Record<Tone, string> = {
  live: "text-[color:var(--measured)] border-[color:var(--measured)]/40",
  unsigned: "text-gold border-gold/40",
  broken: "text-destructive border-destructive/40",
  doctrine: "text-muted-foreground border-border",
  idle: "text-muted-foreground border-border",
};

// ----- page -----

function StatusPage() {
  const [manifest, setManifest] = useState<ManifestT | null>(null);
  const [cid, setCid] = useState("…");
  const [refreshedAt, setRefreshedAt] = useState<number>(0);

  const rebuild = useMemo(
    () => async () => {
      const r = await buildFinalManifest();
      setManifest(r.manifest);
      setCid(r.cid);
      setRefreshedAt(Date.now());
    },
    [],
  );

  useEffect(() => {
    void rebuild();
    const offA = subscribeAnchors(() => void rebuild());
    const offO = subscribeOverrides(() => void rebuild());
    const t = setInterval(() => void rebuild(), 15_000);
    return () => {
      offA();
      offO();
      clearInterval(t);
    };
  }, [rebuild]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="border-b border-border pb-6">
        <div className="text-[0.7rem] uppercase tracking-[0.18em] text-gold">
          Live Status
        </div>
        <h1 className="mt-2 font-display text-3xl text-foreground">
          Fleet, anchors, and Golden Truth
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          This page measures rather than asserts. Nodes are LIVE only on a
          valid ARCHANGEL/v0 signed-status payload; anchors count only when an
          operator-recorded Bitcoin block height is on file; the Golden Truth
          CID is recomputed from those facts every 15 seconds.
        </p>
      </header>

      <section className="mt-8">
        <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Nodes
        </h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {NODES.map((n) => (
            <NodeRow key={n.id} node={n} />
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          OTS anchor inclusion
        </h2>
        {manifest ? (
          <AnchorPanel m={manifest} />
        ) : (
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            computing…
          </p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Golden Truth CID
        </h2>
        <GoldenTile cid={cid} m={manifest} refreshedAt={refreshedAt} />
      </section>

      <section className="mt-8">
        <PipelineFlow />
      </section>
    </main>
  );
}

function NodeRow({ node }: { node: SovereignNode }) {
  const s = useProbeStatus(node.id);
  const c = classify(node, s);
  const probe = getOverride(node.id) ?? node.probe;
  return (
    <li className={`border bg-background/60 p-3 ${TONE[c.tone]}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-foreground">{node.name}</span>
        <span className="text-[0.6rem] uppercase tracking-[0.18em]">{c.label}</span>
      </div>
      <div className="mt-1 font-mono text-[0.65rem] text-muted-foreground break-all">
        {(probe && ("url" in probe ? probe.url : `ipfs://${(probe as { cid: string }).cid}`)) ?? node.region}
      </div>
      <div className="mt-1 font-mono text-[0.65rem]">{c.detail}</div>
    </li>
  );
}

function AnchorPanel({ m }: { m: ManifestT }) {
  const pct =
    m.receipts_total === 0
      ? 0
      : Math.round((m.anchored_count / m.receipts_total) * 100);
  return (
    <div className="mt-3 border border-border bg-card/30 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="font-mono text-xs text-foreground">
          {m.anchored_count} / {m.receipts_total} anchored
          <span className="ml-2 text-muted-foreground">({pct}%)</span>
        </div>
        <div className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
          {m.pending_count} pending · operator-recorded anchors: {m.anchors_total}
        </div>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden bg-border">
        <div
          className="h-full bg-[color:var(--measured)]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="mt-4 max-h-72 space-y-1 overflow-auto pr-1">
        {m.receipts.map((r) => (
          <li
            key={r.sha256}
            className="flex items-start justify-between gap-3 border border-border/60 bg-background/40 p-2"
          >
            <div className="min-w-0">
              <div className="font-mono text-[0.65rem] text-foreground truncate">
                {r.subsystem} · {r.command}
              </div>
              <div className="mt-0.5 font-mono text-[0.6rem] text-muted-foreground break-all">
                {r.sha256}
              </div>
            </div>
            <div className="shrink-0 text-right">
              {r.anchor ? (
                <>
                  <div className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-[color:var(--measured)]">
                    ANCHORED
                  </div>
                  <div className="font-mono text-[0.6rem] text-muted-foreground">
                    block {r.anchor.block_height}
                  </div>
                </>
              ) : (
                <div className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-gold">
                  PENDING
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GoldenTile({
  cid,
  m,
  refreshedAt,
}: {
  cid: string;
  m: ManifestT | null;
  refreshedAt: number;
}) {
  const coupling = m?.coupling ?? "pending";
  const couplingTone =
    coupling === "golden"
      ? "text-[color:var(--measured)] border-[color:var(--measured)]/40"
      : coupling === "partial"
        ? "text-gold border-gold/40"
        : "text-muted-foreground border-border";
  return (
    <div className={`mt-3 border bg-card/30 p-4 ${couplingTone}`}>
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[0.6rem] uppercase tracking-[0.18em]">
          Coupling · {coupling}
        </div>
        <div className="font-mono text-[0.6rem] text-muted-foreground">
          {refreshedAt ? new Date(refreshedAt).toLocaleTimeString() : "—"}
        </div>
      </div>
      <div className="mt-2 font-mono text-xs break-all text-foreground">{cid}</div>
      {m && (
        <div className="mt-2 font-mono text-[0.6rem] text-muted-foreground break-all">
          payload_cid: {m.payload_cid}
        </div>
      )}
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        GOLDEN requires every receipt anchored to a Bitcoin block height.
        PARTIAL means at least one receipt is anchored. PENDING means nothing
        is on-chain yet. The CID is content-defined: identical state yields the
        identical CID.
      </p>
    </div>
  );
}
