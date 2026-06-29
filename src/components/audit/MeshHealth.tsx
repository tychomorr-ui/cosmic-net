// MeshHealth — the Coupling tile.
//
// A blade goes GREEN only when its node satisfies the Coupling Condition:
//   (1) /status returns a valid ed25519-signed payload (state === "measured"
//       via probeSignedStatus), AND
//   (2) the canonical CID we compute locally matches what the node reports.
//
// Until both are true, the tile reports the actual failure mode honestly —
// no opaque 200 is allowed to pass for "live".

import { useSyncExternalStore } from "react";
import { NODES, type SovereignNode } from "@/data/nodes";
import { useProbeStatus } from "@/lib/probe-store";
import type { ProbeStatus } from "@/lib/probes";

type CouplingState = "live" | "broken" | "theater" | "doctrine";

function classify(node: SovereignNode, s: ProbeStatus): { tone: CouplingState; label: string; detail: string } {
  if (!node.probe) {
    return {
      tone: "doctrine",
      label: "DOCTRINE",
      detail: "no probe declared · not a candidate for LIVE",
    };
  }
  const kind = node.probe.kind;
  if (s.state === "measured" && kind === "signed-status") {
    return { tone: "live", label: "LIVE", detail: s.detail ?? "signed status · cid matched" };
  }
  if (s.state === "measured") {
    return {
      tone: "theater",
      label: "THEATER",
      detail: `${kind} · ${s.detail ?? "200 OK without signed payload"}`,
    };
  }
  if (s.state === "reachable") {
    return {
      tone: "theater",
      label: "THEATER",
      detail: `opaque reachability · ${s.detail ?? "no signed payload"}`,
    };
  }
  if (s.state === "unreachable") {
    return { tone: "broken", label: "BROKEN", detail: s.detail ?? "unreachable" };
  }
  if (s.state === "probing") {
    return { tone: "broken", label: "PROBING", detail: "in flight" };
  }
  return { tone: "broken", label: "IDLE", detail: "no probe result yet" };
}

const TONE: Record<CouplingState, string> = {
  live: "text-[color:var(--measured)] border-[color:var(--measured)]/40",
  broken: "text-destructive border-destructive/40",
  theater: "text-gold border-gold/40",
  doctrine: "text-muted-foreground border-border",
};

export function MeshHealth() {
  // Force re-render at the same cadence as any single node's probe store update.
  useSyncExternalStore(
    () => () => {},
    () => 0,
    () => 0,
  );
  const candidates = NODES.filter((n) => n.probe);
  return (
    <section className="border border-border bg-card/30 p-6">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[0.7rem] uppercase tracking-[0.18em] text-gold">
            Mesh Health · Coupling Condition
          </div>
          <h3 className="mt-2 font-display text-lg text-foreground">
            Signed status + matching CID, or it is not LIVE
          </h3>
        </div>
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
          {candidates.length} probed · {NODES.length - candidates.length} doctrine
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        THEATER means the origin answered but did not satisfy the ARCHANGEL/v0 signed-status
        contract. Promote a node by serving signed <code className="font-mono">/status</code>{" "}
        from the daemon and switching its <code className="font-mono">probe.kind</code> to{" "}
        <code className="font-mono">signed-status</code>.
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {NODES.map((n) => (
          <HealthRow key={n.id} node={n} />
        ))}
      </ul>
    </section>
  );
}

function HealthRow({ node }: { node: SovereignNode }) {
  const s = useProbeStatus(node.id);
  const c = classify(node, s);
  return (
    <li className={`border bg-background/60 p-3 ${TONE[c.tone]}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-foreground">{node.name}</span>
        <span className="text-[0.6rem] uppercase tracking-[0.18em]">{c.label}</span>
      </div>
      <div className="mt-1 font-mono text-[0.65rem] text-muted-foreground">
        {node.probe?.url ?? node.region}
      </div>
      <div className="mt-1 font-mono text-[0.65rem]">{c.detail}</div>
    </li>
  );
}
