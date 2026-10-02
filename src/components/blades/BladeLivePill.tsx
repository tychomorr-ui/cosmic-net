import type { Blade } from "@/data/blades";
import { NODES } from "@/data/nodes";
import { BLADE_NODE_BINDING } from "@/lib/blade-readiness";
import { useProbeStatus } from "@/lib/probe-store";

export type BladeLive = {
  label: string;
  tone: "live" | "warn" | "down" | "muted";
  title: string;
};

const SIGNED_KINDS = new Set(["signed-status", "ipfs-signed-status"]);

/** Blade label derived from its bound node's current signed-status probe. */
export function useBladeLive(blade: Blade): BladeLive {
  const nodeId = BLADE_NODE_BINDING[blade.n];
  const node = nodeId ? NODES.find((n) => n.id === nodeId) : undefined;
  const s = useProbeStatus(nodeId ?? "__none__");

  if (blade.status === "STANDBY")
    return { label: "STANDBY", tone: "muted", title: blade.blocker ?? "Awaiting first real signal" };
  if (!node)
    return { label: "LOCAL · NO NODE", tone: "muted", title: "Runs in your browser only — no node to verify" };
  if (!node.probe)
    return { label: "UNVERIFIED", tone: "warn", title: `${node.name}: no signed status endpoint declared` };

  const signed = SIGNED_KINDS.has(node.probe.kind);
  switch (s.state) {
    case "idle":
    case "probing":
      return { label: "CHECKING…", tone: "muted", title: `Probing ${node.name}` };
    case "unreachable":
      return { label: "UNREACHABLE", tone: "down", title: `${node.name}: ${s.detail}` };
    case "measured":
      return signed
        ? { label: "LIVE · SIGNED", tone: "live", title: `${node.name}: ed25519 signature verified · ${s.detail}` }
        : { label: "UNVERIFIED", tone: "warn", title: `${node.name}: answered but unsigned · ${s.detail}` };
    case "reachable":
      return { label: "UNVERIFIED", tone: "warn", title: `${node.name}: reachable, no valid signature · ${s.detail}` };
  }
}

const TONE: Record<BladeLive["tone"], string> = {
  live: "border-gold/60 text-gold",
  warn: "border-amber-500/50 text-amber-500",
  down: "border-destructive/60 text-destructive",
  muted: "border-border text-muted-foreground",
};

export function BladeLivePill({ blade, className = "" }: { blade: Blade; className?: string }) {
  const live = useBladeLive(blade);
  return (
    <span
      title={live.title}
      className={`inline-block rounded border px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.2em] ${TONE[live.tone]} ${className}`}
    >
      {live.label}
    </span>
  );
}
