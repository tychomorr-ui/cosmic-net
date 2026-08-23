// Operator-only form: bind a node's ed25519 public key + signed-status URL
// at runtime so MeshHealth can promote it from UNSIGNED to LIVE the moment
// the daemon serves a valid ARCHANGEL/v0 signed /status.
//
// Stored locally (localStorage + IDB). No key is ever shipped to the repo.

import { useEffect, useState } from "react";
import { NODES } from "@/data/nodes";
import {
  clearOverride,
  listOverrides,
  setSignedOverride,
  subscribeOverrides,
  type NodeOverride,
} from "@/lib/node-overrides";
import { useProbeStatus } from "@/lib/probe-store";
import type { ProbeStatus } from "@/lib/probes";

const PROMOTABLE = NODES.filter((n) => n.probe && n.probe.kind !== "signed-status");

export function ValkyrieActivator() {
  const [overrides, setOverrides] = useState<Record<string, NodeOverride>>({});
  const [nodeId, setNodeId] = useState(PROMOTABLE[0]?.id ?? "");
  const [url, setUrl] = useState("");
  const [pub, setPub] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => setOverrides(listOverrides());
    refresh();
    return subscribeOverrides(refresh);
  }, []);

  // Sensible default: when Valkyrie is selected and no URL set, prefill its origin.
  useEffect(() => {
    const n = NODES.find((x) => x.id === nodeId);
    const p = n?.probe;
    if (p && p.kind !== "ipfs-signed-status" && !url) {
      const u = new URL(p.url);
      setUrl(`${u.origin}/status`);
    }
  }, [nodeId, url]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setOk(null);
    try {
      setSignedOverride(nodeId, url, pub);
      setOk(`override applied · ${nodeId}`);
      setPub("");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "invalid input");
    }
  };

  return (
    <section className="border border-border bg-card/30 p-6">
      <div className="text-[0.7rem] uppercase tracking-[0.18em] text-gold">
        Blade Activator · signed-status override
      </div>
      <h3 className="mt-2 font-display text-lg text-foreground">
        Promote a node from UNSIGNED → LIVE
      </h3>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Paste the daemon's 32-byte ed25519 public key (64 hex chars) and the
        CORS-readable signed <code className="font-mono">/status</code> URL.
        Stored locally only — never committed to the repo, never sent off-device.
        MeshHealth flips to LIVE on the next successful signature verification.
      </p>

      <form onSubmit={submit} className="mt-4 grid gap-2 sm:grid-cols-[180px_1fr_auto]">
        <select
          value={nodeId}
          onChange={(e) => setNodeId(e.target.value)}
          className="border border-border bg-background px-2 py-1 font-mono text-[0.7rem] text-foreground"
        >
          {PROMOTABLE.map((n) => (
            <option key={n.id} value={n.id}>
              {n.name}
            </option>
          ))}
        </select>
        <input
          aria-label="signed-status URL"
          placeholder="https://34.223.165.42/status"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="border border-border bg-background px-2 py-1 font-mono text-[0.7rem] text-foreground"
        />
        <input
          aria-label="ed25519 public key (hex)"
          placeholder="edPubHex · 64-char hex"
          value={pub}
          onChange={(e) => setPub(e.target.value)}
          className="border border-border bg-background px-2 py-1 font-mono text-[0.7rem] text-foreground sm:col-span-2"
        />
        <button
          type="submit"
          className="border border-gold px-3 py-1 text-[0.65rem] uppercase tracking-[0.18em] text-gold"
        >
          apply override
        </button>
        {err && <div className="text-[0.65rem] text-destructive sm:col-span-3">{err}</div>}
        {ok && <div className="text-[0.65rem] text-[color:var(--measured)] sm:col-span-3">{ok}</div>}
      </form>

      <ul className="mt-4 space-y-2">
        {Object.entries(overrides).map(([id, ov]) => (
          <OverrideRow key={id} id={id} ov={ov} onClear={() => clearOverride(id)} />
        ))}
        {Object.keys(overrides).length === 0 && (
          <li className="border border-dashed border-border p-3 text-[0.65rem] text-muted-foreground">
            no overrides recorded · all nodes use repo defaults
          </li>
        )}
      </ul>
    </section>
  );
}

function probeLine(s: ProbeStatus): { label: string; tone: string; detail: string } {
  switch (s.state) {
    case "measured":
      return { label: "LIVE", tone: "text-[color:var(--measured)]", detail: s.detail };
    case "reachable":
      return { label: "UNSIGNED", tone: "text-gold", detail: s.detail };
    case "unreachable":
      return { label: "BROKEN", tone: "text-destructive", detail: s.detail };
    case "probing":
      return { label: "PROBING", tone: "text-muted-foreground", detail: "handshake in flight" };
    default:
      return { label: "IDLE", tone: "text-muted-foreground", detail: "awaiting first tick" };
  }
}

function OverrideRow({
  id,
  ov,
  onClear,
}: {
  id: string;
  ov: NodeOverride;
  onClear: () => void;
}) {
  const n = NODES.find((x) => x.id === id);
  const status = useProbeStatus(id);
  const line = probeLine(status);
  return (
    <li className="flex flex-wrap items-start justify-between gap-2 border border-border bg-background/60 p-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-foreground">{n?.name ?? id}</span>
          <span className={`text-[0.6rem] uppercase tracking-[0.18em] ${line.tone}`}>
            {line.label}
          </span>
        </div>
        <div className="break-all font-mono text-[0.65rem] text-muted-foreground">{ov.url}</div>
        <div className="break-all font-mono text-[0.65rem] text-foreground/70">
          pub {ov.edPubHex.slice(0, 12)}…{ov.edPubHex.slice(-8)}
        </div>
        <div className="mt-1 font-mono text-[0.6rem] text-muted-foreground">
          last probe · {line.detail}
        </div>
      </div>
      <button
        onClick={onClear}
        className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground hover:text-destructive"
      >
        clear
      </button>
    </li>
  );
}
