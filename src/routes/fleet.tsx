import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { loadFleet, type FleetNode } from "@/data/fleet";
import { probeSignedStatus, type NodeStatus } from "@/lib/probe-signed";
import type { ProbeStatus } from "@/lib/probes";
import { fingerprint } from "@/lib/sovereign-keys";

export const Route = createFileRoute("/fleet")({
  head: () => ({
    meta: [
      { title: "Fleet · Signed Status · Nexinus Terminus" },
      {
        name: "description",
        content:
          "Cryptographically verified fleet status. MEASURED only on valid ed25519 signature over the node's /status payload.",
      },
      { property: "og:title", content: "Fleet · Nexinus Terminus" },
      {
        property: "og:description",
        content: "ed25519-verified status for every enrolled archangeld node.",
      },
    ],
  }),
  component: FleetPage,
});

function FleetPage() {
  const [fleet, setFleet] = useState<FleetNode[]>([]);
  const [results, setResults] = useState<Record<string, ProbeStatus & { payload?: NodeStatus }>>({});

  useEffect(() => {
    setFleet(loadFleet());
  }, []);

  useEffect(() => {
    if (fleet.length === 0) return;
    let cancelled = false;
    const run = async () => {
      const next: typeof results = {};
      await Promise.all(
        fleet.map(async (n) => {
          next[n.id] = await probeSignedStatus(n.statusUrl, n.edPubHex);
        }),
      );
      if (!cancelled) setResults(next);
    };
    void run();
    const t = setInterval(run, 20_000);
    return () => { cancelled = true; clearInterval(t); };
  }, [fleet]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="border-b border-border pb-6">
        <div className="text-[0.7rem] uppercase tracking-[0.2em] text-gold">
          Fleet · Signed /status Probes
        </div>
        <h1 className="mt-2 font-display text-3xl text-foreground">
          cryptographically verified fleet
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          A node only flips MEASURED when its <code className="text-gold">/status</code>
          response carries a valid ed25519 signature over the canonical payload using the
          pubkey you pinned at enrollment. HTTP 200 alone is REACHABLE, not measured.
        </p>
      </header>

      {fleet.length === 0 ? (
        <div className="mt-10 border border-border bg-card/30 p-8 text-sm text-muted-foreground">
          No enrolled nodes on this device. Visit{" "}
          <a href="/gateway" className="text-gold hover:underline">/gateway</a>{" "}
          to mint operator keys and enroll your first archangeld node.
        </div>
      ) : (
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {fleet.map((n) => (
            <NodeRow key={n.id} node={n} status={results[n.id]} />
          ))}
        </ul>
      )}
    </div>
  );
}

function NodeRow({
  node,
  status,
}: {
  node: FleetNode;
  status?: ProbeStatus & { payload?: NodeStatus };
}) {
  const [label, tone] = labelFor(status);
  return (
    <li className="border border-border bg-background/60 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-display text-base text-foreground">{node.label}</div>
          <div className="font-mono text-[0.65rem] text-muted-foreground">{node.region} · {node.endpoint}</div>
        </div>
        <span className={`text-[0.6rem] uppercase tracking-[0.18em] ${tone}`}>{label}</span>
      </div>
      <dl className="mt-3 grid gap-1 text-[0.7rem]">
        <Row k="status url" v={node.statusUrl} />
        <Row k="ed25519 fp" v={fingerprint(node.edPubHex)} />
        <Row k="detail" v={status && "detail" in status ? status.detail : "—"} />
        {status && status.state === "measured" && "payload" in status && status.payload && (
          <Row
            k="wg"
            v={`peers=${status.payload.wg.peers} · last_hs=${status.payload.wg.last_handshake_max_age_s}s`}
          />
        )}
      </dl>
    </li>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-1">
      <span className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">{k}</span>
      <span className="break-all font-mono text-foreground/85">{v}</span>
    </div>
  );
}

function labelFor(s?: ProbeStatus): [string, string] {
  if (!s || s.state === "idle") return ["IDLE", "text-muted-foreground"];
  if (s.state === "probing") return ["PROBING", "text-muted-foreground"];
  if (s.state === "measured") return ["MEASURED · SIGNED", "text-[color:var(--measured)]"];
  if (s.state === "reachable") return ["REACHABLE", "text-gold"];
  return ["UNREACHABLE", "text-destructive"];
}
