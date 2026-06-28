import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { OPS_LOG, DECLARED_GATEWAYS, OPS_ARTIFACT_NAME, type OpsEntry } from "@/data/ops";
import { canonicalize, valueToCid } from "@/lib/cid";
import { probeCorsJson, probeOpaqueHead, type ProbeStatus } from "@/lib/probes";
import { CentralizationInventory } from "@/components/audit/CentralizationInventory";
import { ExtractionAudit } from "@/components/audit/ExtractionAudit";
import { BuildReceipt } from "@/components/audit/BuildReceipt";
import { TelemetryToggle } from "@/components/audit/TelemetryToggle";
import { ReclaimExport } from "@/components/audit/ReclaimExport";

export const Route = createFileRoute("/ops")({
  head: () => ({
    meta: [
      { title: "Ops Ledger · Nexinus Terminus" },
      {
        name: "description",
        content:
          "Verified operations artifact bound to live gateway probes. Each entry addressable by CID.",
      },
      { property: "og:title", content: "Ops Ledger · Nexinus Terminus" },
      {
        property: "og:description",
        content: "Sovereign witness over the terminus-ops artifact, content-addressed.",
      },
    ],
  }),
  component: OpsPage,
});

type CidMap = Record<number, string>;

function OpsPage() {
  const [cids, setCids] = useState<CidMap>({});
  const [manifestCid, setManifestCid] = useState<string>("…");
  const [filter, setFilter] = useState<string>("ALL");
  const [probes, setProbes] = useState<Record<string, ProbeStatus>>({});

  // Compute per-entry + manifest CIDs once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: CidMap = {};
      for (let i = 0; i < OPS_LOG.length; i++) {
        next[i] = await valueToCid(OPS_LOG[i]);
      }
      const top = await valueToCid({
        artifact: OPS_ARTIFACT_NAME,
        entries: OPS_LOG.length,
        bytes: canonicalize(OPS_LOG).byteLength,
      });
      if (!cancelled) {
        setCids(next);
        setManifestCid(top);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Live probes against the declared gateways from sam.status.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const out: Record<string, ProbeStatus> = {};
      await Promise.all(
        DECLARED_GATEWAYS.map(async (g) => {
          const status =
            g.host === "monarch.xinus.one"
              ? await probeCorsJson(g.url, "ok")
              : await probeOpaqueHead(g.url);
          out[g.host] = status;
        }),
      );
      if (!cancelled) setProbes(out);
    };
    void run();
    const t = setInterval(run, 30_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  const subsystems = useMemo(
    () => Array.from(new Set(OPS_LOG.map((e) => e.subsystem))).sort(),
    [],
  );

  const filtered = useMemo(
    () => OPS_LOG.map((e, i) => ({ e, i })).filter(({ e }) => filter === "ALL" || e.subsystem === filter),
    [filter],
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="border-b border-border pb-6">
        <div className="text-[0.7rem] uppercase tracking-[0.18em] text-gold">
          Ops Ledger · Verified Artifact
        </div>
        <h1 className="mt-2 font-display text-3xl text-foreground">
          {OPS_ARTIFACT_NAME}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          This page binds an imported operations log to live gateway probes. Every entry is
          content-addressed (CIDv1 · dag-json · sha-256). The bytes never leave the browser; CIDs
          are recomputed locally on load and can be reproduced from the JSON in this repo. No
          managed queue, no centralized event bus.
        </p>
        <dl className="mt-5 grid gap-3 text-xs sm:grid-cols-3">
          <div className="border border-border bg-card/40 p-3">
            <dt className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">Entries</dt>
            <dd className="mt-1 font-mono text-foreground">{OPS_LOG.length}</dd>
          </div>
          <div className="border border-border bg-card/40 p-3">
            <dt className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">Manifest CID</dt>
            <dd className="mt-1 break-all font-mono text-[0.7rem] text-foreground">{manifestCid}</dd>
          </div>
          <div className="border border-border bg-card/40 p-3">
            <dt className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">Transport</dt>
            <dd className="mt-1 font-mono text-foreground">CID-only · unpinned · local witness</dd>
          </div>
        </dl>
      </header>

      <section className="mt-8">
        <div className="text-[0.7rem] uppercase tracking-[0.18em] text-gold">
          Declared gateways · live probes
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {DECLARED_GATEWAYS.map((g) => {
            const s = probes[g.host];
            return <GatewayRow key={g.host} host={g.host} url={g.url} status={s} />;
          })}
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div className="text-[0.7rem] uppercase tracking-[0.18em] text-gold">
            Entries · {filtered.length}
          </div>
          <div className="flex flex-wrap gap-1">
            {(["ALL", ...subsystems] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`border px-2 py-1 text-[0.65rem] uppercase tracking-[0.16em] transition-colors ${
                  filter === s
                    ? "border-gold text-gold"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <ul className="mt-4 space-y-3">
          {filtered.map(({ e, i }) => (
            <EntryCard key={i} entry={e} cid={cids[i] ?? "…"} />
          ))}
        </ul>
      </section>

      <section className="mt-10 space-y-4">
        <ExtractionAudit />
        <BuildReceipt />
        <CentralizationInventory />
        <TelemetryToggle />
      </section>
    </div>
  );
}

function GatewayRow({ host, url, status }: { host: string; url: string; status?: ProbeStatus }) {
  const [label, tone] = labelFor(status);
  return (
    <div className="border border-border bg-card/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <a href={url} target="_blank" rel="noreferrer" className="font-mono text-xs text-foreground hover:text-gold">
          {host}
        </a>
        <span className={`text-[0.6rem] uppercase tracking-[0.18em] ${tone}`}>{label}</span>
      </div>
      <div className="mt-1 font-mono text-[0.65rem] text-muted-foreground">
        {status && "detail" in status ? status.detail : "—"}
      </div>
    </div>
  );
}

function labelFor(s?: ProbeStatus): [string, string] {
  if (!s || s.state === "idle") return ["IDLE", "text-muted-foreground"];
  if (s.state === "probing") return ["PROBING", "text-muted-foreground"];
  if (s.state === "measured") return ["MEASURED · ONLINE", "text-[color:var(--measured)]"];
  if (s.state === "reachable") return ["REACHABLE", "text-gold"];
  return ["UNREACHABLE", "text-destructive"];
}

function EntryCard({ entry, cid }: { entry: OpsEntry; cid: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <li className="border border-border bg-background/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-[0.65rem] uppercase tracking-[0.18em]">
          <span className="border border-border px-2 py-0.5 text-foreground">{entry.subsystem}</span>
          <span className="text-muted-foreground">{entry.level}</span>
          <span className="text-gold">◆</span>
          <span className="font-mono text-foreground/80 normal-case tracking-normal">{entry.command}</span>
        </div>
        <time className="font-mono text-[0.65rem] text-muted-foreground">{entry.ts}</time>
      </div>
      <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-[0.72rem] leading-relaxed text-foreground/85">
        {entry.result}
      </pre>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
        <code className="break-all font-mono text-[0.65rem] text-muted-foreground">{cid}</code>
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(cid);
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            } catch { /* clipboard unavailable */ }
          }}
          className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground hover:text-gold"
        >
          {copied ? "copied" : "copy cid"}
        </button>
      </div>
    </li>
  );
}
