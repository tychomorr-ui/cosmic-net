// Triangular cluster visualization. Renders each 3-node triangle as an SVG
// with vertices colored by live probe state. No animation theater — the tone
// is measured by the same classify() logic used elsewhere.

import { useProbeStatus } from "@/lib/probe-store";
import { getOverride } from "@/lib/node-overrides";
import { probeTarget, type ClusterId, type SovereignNode } from "@/data/nodes";
import type { ProbeStatus } from "@/lib/probes";

type Tone = "live" | "unsigned" | "broken" | "doctrine" | "idle";

function classify(node: SovereignNode, s: ProbeStatus): { tone: Tone; label: string } {
  const probe = getOverride(node.id) ?? node.probe;
  if (!probe) return { tone: "doctrine", label: "DOCTRINE" };
  const isSigned = probe.kind === "signed-status" || probe.kind === "ipfs-signed-status";
  if (s.state === "measured" && isSigned) return { tone: "live", label: "LIVE" };
  if (s.state === "measured" || s.state === "reachable") return { tone: "unsigned", label: "UNSIGNED" };
  if (s.state === "unreachable") return { tone: "broken", label: "BROKEN" };
  if (s.state === "probing") return { tone: "idle", label: "PROBING" };
  return { tone: "idle", label: "IDLE" };
}

const FILL: Record<Tone, string> = {
  live: "var(--measured)",
  unsigned: "#c9a227",
  broken: "hsl(var(--destructive))",
  doctrine: "hsl(var(--muted-foreground))",
  idle: "hsl(var(--muted-foreground))",
};

const LABEL_TONE: Record<Tone, string> = {
  live: "text-[color:var(--measured)]",
  unsigned: "text-gold",
  broken: "text-destructive",
  doctrine: "text-muted-foreground",
  idle: "text-muted-foreground",
};

type Vertex = { x: number; y: number; anchor: "start" | "middle" | "end"; dy: number };

// Equilateral triangle vertices inside a 300x260 viewBox, apex on top.
const VERTS: Vertex[] = [
  { x: 150, y: 40, anchor: "middle", dy: -14 },   // top (anchor)
  { x: 40, y: 220, anchor: "end", dy: 22 },       // bottom-left
  { x: 260, y: 220, anchor: "start", dy: 22 },    // bottom-right
];

export function TriangleCluster({
  clusterId,
  nodes,
  title,
}: {
  clusterId: ClusterId;
  nodes: SovereignNode[];
  title: string;
}) {
  // Order: anchor first, then vertices in declaration order.
  const anchor = nodes.find((n) => n.cluster_role === "anchor");
  const vertices = nodes.filter((n) => n.cluster_role !== "anchor");
  const ordered = [anchor, ...vertices].filter(Boolean) as SovereignNode[];

  return (
    <div className="border border-border bg-card/30 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <div className="font-mono text-xs uppercase tracking-[0.18em] text-foreground">
          {title}
        </div>
        <div className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
          cluster · {clusterId}
        </div>
      </div>

      <svg
        viewBox="0 0 300 260"
        className="mx-auto mt-3 block h-auto w-full max-w-[320px]"
        aria-label={`${title} triangle topology`}
      >
        <polygon
          points={VERTS.map((v) => `${v.x},${v.y}`).join(" ")}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="1"
        />
        {ordered.map((n, i) => (
          <ClusterVertex key={n.id} node={n} vertex={VERTS[i]} />
        ))}
      </svg>

      <ul className="mt-3 space-y-1">
        {ordered.map((n) => (
          <ClusterRow key={n.id} node={n} />
        ))}
      </ul>
    </div>
  );
}

function ClusterVertex({ node, vertex }: { node: SovereignNode; vertex: Vertex }) {
  const s = useProbeStatus(node.id);
  const { tone } = classify(node, s);
  const probe = getOverride(node.id) ?? node.probe;
  const isIpfs = probe?.kind === "ipfs-signed-status";
  return (
    <g>
      <circle
        cx={vertex.x}
        cy={vertex.y}
        r={node.cluster_role === "anchor" ? 12 : 9}
        fill={FILL[tone]}
        stroke="hsl(var(--background))"
        strokeWidth="2"
      />
      {isIpfs && (
        <circle
          cx={vertex.x}
          cy={vertex.y}
          r={node.cluster_role === "anchor" ? 16 : 13}
          fill="none"
          stroke={FILL[tone]}
          strokeDasharray="3 3"
          strokeWidth="1"
        />
      )}
      <text
        x={vertex.x}
        y={vertex.y + vertex.dy}
        textAnchor={vertex.anchor}
        className="fill-foreground"
        style={{ font: "10px ui-monospace, monospace" }}
      >
        {node.name}
      </text>
    </g>
  );
}

function ClusterRow({ node }: { node: SovereignNode }) {
  const s = useProbeStatus(node.id);
  const c = classify(node, s);
  const probe = getOverride(node.id) ?? node.probe;
  const kindTag =
    probe?.kind === "ipfs-signed-status"
      ? "IPFS-GATED"
      : probe?.kind === "signed-status"
        ? "ARCHANGEL/v0"
        : probe?.kind === "no-cors-head"
          ? "HEAD"
          : probe?.kind === "cors-json"
            ? "CORS-JSON"
            : "NO-PROBE";
  return (
    <li className="border border-border/60 bg-background/40 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-mono text-[0.7rem] text-foreground">
          {node.name}
          {node.cluster_role === "anchor" && (
            <span className="ml-1 text-[0.55rem] uppercase tracking-[0.18em] text-muted-foreground">
              · anchor
            </span>
          )}
        </span>
        <span className={`text-[0.55rem] uppercase tracking-[0.18em] ${LABEL_TONE[c.tone]}`}>
          {c.label}
        </span>
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-2">
        <span className="truncate font-mono text-[0.6rem] text-muted-foreground">
          {probeTarget(probe) || "no surface"}
        </span>
        <span className="shrink-0 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-muted-foreground">
          {kindTag}
        </span>
      </div>
    </li>
  );
}
