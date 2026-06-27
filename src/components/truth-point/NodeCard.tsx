import type { SovereignNode } from "@/data/nodes";
import { useProbeStatus } from "@/lib/probe-store";
import { TierBadge } from "./TierBadge";

export function NodeCard({ node }: { node: SovereignNode }) {
  const probe = useProbeStatus(node.id);

  // Effective tier: a measured probe promotes attested → measured.
  const effectiveTier =
    node.probe && probe.state === "measured" ? "measured" : node.tier;

  return (
    <article className="flex flex-col gap-4 border border-border bg-card/40 p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-lg text-foreground">{node.name}</h3>
          <div className="mt-1 text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
            {node.provider} · {node.region}
          </div>
        </div>
        <TierBadge tier={effectiveTier} />
      </header>

      <div className="text-xs uppercase tracking-[0.14em] text-gold">{node.role}</div>

      <ul className="space-y-1.5 text-sm text-foreground/85">
        {node.facts.map((f, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-1 size-1 shrink-0 rounded-full bg-border" />
            {f}
          </li>
        ))}
      </ul>

      <p className="border-l-2 border-border pl-3 text-xs leading-relaxed text-muted-foreground">
        {node.truth}
      </p>

      {node.probe && (
        <div className="mt-1 border-t border-border pt-3 font-mono text-[0.7rem]">
          <div className="flex items-center justify-between">
            <span className="uppercase tracking-[0.18em] text-muted-foreground">Live probe</span>
            <ProbeBadge state={probe.state} />
          </div>
          <div className="mt-1 truncate text-muted-foreground">{node.probe.url}</div>
          {"detail" in probe && (
            <div className="mt-1 text-foreground/70">{probe.detail}</div>
          )}
        </div>
      )}
    </article>
  );
}

function ProbeBadge({ state }: { state: string }) {
  const color =
    state === "measured" ? "text-[color:var(--measured)]" :
    state === "reachable" ? "text-gold" :
    state === "unreachable" ? "text-destructive" :
    state === "probing" ? "text-foreground" :
    "text-muted-foreground";
  return <span className={`uppercase tracking-[0.18em] ${color}`}>{state}</span>;
}
