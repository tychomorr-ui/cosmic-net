// Public Provenance Ledger — every hash in one place, with its BTC
// confirmation (block height + optional txid) if recorded, or an honest
// PENDING label if not. Anyone can copy a SHA-256 and independently
// re-verify against the Bitcoin blockchain via mempool.space.

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { parseProvenance } from "@/lib/provenance";
import { getAnchor, subscribeAnchors, type Anchor } from "@/lib/anchors";
import { KNOWN_ANCHORS } from "@/data/known-anchors";
import { buildProvenanceBundle, downloadProvenanceBundle } from "@/lib/provenance-bundle";

export const Route = createFileRoute("/ledger")({
  head: () => ({
    meta: [
      { title: "Public Provenance Ledger · Every Hash, Every Confirmation" },
      {
        name: "description",
        content:
          "Every SHA-256 hash from the sovereign ledger, with its Bitcoin block-height confirmation when recorded. Copy any hash and verify against mempool.space — no trust required.",
      },
      { property: "og:title", content: "Public Provenance Ledger · Nexinus Terminus" },
      {
        property: "og:description",
        content:
          "One public page for every sovereign hash and its BTC confirmation. Copy and verify independently.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LedgerPage,
});

type Row = {
  sha256: string;
  subsystem: string;
  command: string;
  ts: string;
  otsFiles: string[];
  anchor: Anchor | null;
};

function LedgerPage() {
  const [, force] = useState(0);
  useEffect(() => subscribeAnchors(() => force((n) => n + 1)), []);

  // Live BTC tip height so we render REAL confirmation depth per anchor.
  // Fetched from mempool.space (independent third party). If the fetch
  // fails we omit confirmations — never fabricate a number.
  const [tipHeight, setTipHeight] = useState<number | null>(null);
  const [tipFetchedAt, setTipFetchedAt] = useState<number | null>(null);
  const [tipError, setTipError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("https://mempool.space/api/blocks/tip/height", {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const h = Number((await res.text()).trim());
        if (!Number.isFinite(h)) throw new Error("non-numeric tip");
        if (!alive) return;
        setTipHeight(h);
        setTipFetchedAt(Date.now());
        setTipError(null);
      } catch (e) {
        if (!alive) return;
        setTipError(e instanceof Error ? e.message : "fetch failed");
      }
    };
    void load();
    const id = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const confirmationsFor = (h: number): number | null =>
    tipHeight === null ? null : Math.max(0, tipHeight - h + 1);

  const settlementLabel = (n: number): { label: string; tone: string } => {
    if (n >= 2016) return { label: "IRREVERSIBLE", tone: "text-[color:var(--measured)]" };
    if (n >= 144) return { label: "SETTLED", tone: "text-[color:var(--measured)]" };
    if (n >= 6) return { label: "CONFIRMED", tone: "text-gold" };
    if (n >= 1) return { label: "FRESH", tone: "text-gold" };
    return { label: "PROPAGATING", tone: "text-muted-foreground" };
  };

  const rows = useMemo<Row[]>(() => {
    const seen = new Set<string>();
    const out: Row[] = [];
    // Every hash extracted from the ops ledger (may include pending items).
    for (const r of parseProvenance()) {
      for (const sha of r.hashes) {
        if (seen.has(sha)) continue;
        seen.add(sha);
        out.push({
          sha256: sha,
          subsystem: r.subsystem,
          command: r.command,
          ts: r.ts,
          otsFiles: r.otsFiles,
          anchor: getAnchor(sha) ?? null,
        });
      }
    }
    // Known anchors not present in the ops stream (e.g. the meta-anchor for
    // the manifest itself) still belong on the public ledger.
    for (const sha of Object.keys(KNOWN_ANCHORS)) {
      if (seen.has(sha)) continue;
      seen.add(sha);
      const a = getAnchor(sha)!;
      out.push({
        sha256: sha,
        subsystem: "manifest",
        command: a.note ?? "operator-recorded anchor",
        ts: new Date(a.anchored_at).toISOString(),
        otsFiles: [],
        anchor: a,
      });
    }
    // Anchored first (by block height desc), then pending (by ts desc).
    out.sort((a, b) => {
      if (a.anchor && b.anchor) return b.anchor.block_height - a.anchor.block_height;
      if (a.anchor) return -1;
      if (b.anchor) return 1;
      return a.ts < b.ts ? 1 : -1;
    });
    return out;
  }, []);

  const anchored = rows.filter((r) => r.anchor).length;
  const pending = rows.length - anchored;

  const [q, setQ] = useState("");
  const filtered = q
    ? rows.filter(
        (r) =>
          r.sha256.includes(q.toLowerCase()) ||
          r.command.toLowerCase().includes(q.toLowerCase()) ||
          r.subsystem.toLowerCase().includes(q.toLowerCase()) ||
          (r.anchor && String(r.anchor.block_height).includes(q)),
      )
    : rows;

  const copy = async (v: string, label: string) => {
    try {
      await navigator.clipboard.writeText(v);
      toast.success(`${label} copied`, { description: `${v.slice(0, 14)}…` });
    } catch {
      toast.error("Clipboard unavailable");
    }
  };

  const exportBundle = async () => {
    try {
      const { bundle, json } = await buildProvenanceBundle();
      downloadProvenanceBundle(bundle, json);
      toast.success("Provenance bundle exported", {
        description: `${bundle.anchored_count}/${bundle.receipt_count} anchored · sha256 ${bundle.bundle_sha256.slice(0, 12)}…`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "export failed";
      toast.error("Bundle export failed", { description: msg });
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="border-b border-border pb-6">
        <div className="text-[0.7rem] uppercase tracking-[0.18em] text-gold">
          Public Provenance Ledger
        </div>
        <h1 className="mt-2 font-display text-3xl text-foreground">
          Every hash. Every confirmation. Verifiable by anyone.
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          This page lists every SHA-256 hash the sovereign runtime has produced
          alongside its Bitcoin confirmation (block height + optional txid) when
          one has been recorded from an <code className="font-mono">ots verify</code> run.
          Pending rows are labeled as such — no fabricated confirmations. Copy any
          hash and check it yourself against{" "}
          <a
            href="https://mempool.space"
            target="_blank"
            rel="noreferrer"
            className="text-gold hover:underline"
          >
            mempool.space
          </a>{" "}
          or against the <code className="font-mono">.ots</code> receipt bytes.
        </p>
      </header>

      <section className="mt-6 grid gap-3 sm:grid-cols-4">
        <Tile label="Total hashes" value={String(rows.length)} />
        <Tile label="Anchored (BTC)" value={String(anchored)} tone="measured" />
        <Tile
          label={tipError ? "BTC tip · offline" : "BTC tip (live)"}
          value={tipHeight !== null ? `#${tipHeight.toLocaleString()}` : "…"}
          tone={tipHeight !== null ? "measured" : "muted"}
        />
        <button
          onClick={() => void exportBundle()}
          className="border border-gold bg-background/60 p-3 text-left transition-colors hover:bg-gold/10"
        >
          <div className="text-[0.6rem] uppercase tracking-[0.18em] text-gold">
            Export bundle
          </div>
          <div className="mt-1 font-mono text-xs text-foreground">
            provenance-bundle.json
          </div>
        </button>
      </section>

      <div className="mt-3 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
        {tipHeight !== null && tipFetchedAt !== null ? (
          <>
            live tip from mempool.space · fetched{" "}
            {new Date(tipFetchedAt).toISOString().slice(11, 19)}Z · pending: {pending}
          </>
        ) : tipError ? (
          <>could not reach mempool.space ({tipError}) · confirmations hidden</>
        ) : (
          <>loading live BTC tip…</>
        )}
      </div>


      <div className="mt-6 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="filter by hash, block height, filename, subsystem…"
          className="flex-1 min-w-[240px] border border-border bg-background px-3 py-2 font-mono text-xs text-foreground"
          aria-label="filter ledger"
        />
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
          {filtered.length} / {rows.length}
        </span>
      </div>

      <ul className="mt-4 space-y-3">
        {filtered.map((r) => (
          <li key={r.sha256} className="border border-border bg-card/40 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-[0.6rem] uppercase tracking-[0.18em]">
                  <span className="border border-border px-2 py-0.5 text-foreground">
                    {r.subsystem}
                  </span>
                  <span className="font-mono normal-case tracking-normal text-foreground/80">
                    {r.command}
                  </span>
                  <time className="font-mono text-muted-foreground">{r.ts}</time>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <code className="break-all font-mono text-[0.75rem] text-foreground">
                    {r.sha256}
                  </code>
                  <button
                    onClick={() => void copy(r.sha256, "SHA-256")}
                    className="shrink-0 border border-border px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground hover:text-gold"
                  >
                    copy
                  </button>
                </div>

                {r.anchor ? (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <span className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-[color:var(--measured)]">
                      ⛓ ANCHORED · BTC block #{r.anchor.block_height}
                    </span>
                    {(() => {
                      const c = confirmationsFor(r.anchor.block_height);
                      if (c === null) return null;
                      const s = settlementLabel(c);
                      return (
                        <span
                          className={`border border-[color:var(--measured)]/40 px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.16em] ${s.tone}`}
                          title={`Live from mempool.space · tip #${tipHeight}`}
                        >
                          {c.toLocaleString()} conf · {s.label}
                        </span>
                      );
                    })()}
                    <a
                      href={`https://mempool.space/block/${r.anchor.block_height}`}
                      target="_blank"
                      rel="noreferrer"
                      className="border border-[color:var(--measured)]/40 px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.16em] text-[color:var(--measured)] hover:bg-[color:var(--measured)]/10"
                    >
                      view block
                    </a>
                    {r.anchor.txid && (
                      <>
                        <a
                          href={`https://mempool.space/tx/${r.anchor.txid}`}
                          target="_blank"
                          rel="noreferrer"
                          className="border border-border px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-foreground hover:text-gold"
                          title={r.anchor.txid}
                        >
                          tx {r.anchor.txid.slice(0, 12)}…
                        </a>
                        <button
                          onClick={() => void copy(r.anchor!.txid!, "TXID")}
                          className="border border-border px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground hover:text-gold"
                        >
                          copy tx
                        </button>
                      </>
                    )}
                    {r.anchor.note && (
                      <span className="text-[0.65rem] text-muted-foreground">
                        {r.anchor.note}
                      </span>
                    )}
                  </div>

                ) : (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <span className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-gold">
                      ⏳ PENDING · awaiting BTC inclusion
                    </span>
                    <span className="text-[0.65rem] text-muted-foreground">
                      Stamped via OpenTimestamps; block height will publish after{" "}
                      <code className="font-mono">ots upgrade</code> +{" "}
                      <code className="font-mono">ots verify</code>.
                    </span>
                  </div>
                )}

                {r.otsFiles.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {r.otsFiles.map((f) => (
                      <span
                        key={f}
                        className="border border-border px-2 py-0.5 font-mono text-[0.6rem] text-gold"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <footer className="mt-10 border-t border-border pt-6 text-xs leading-relaxed text-muted-foreground">
        <p className="font-mono uppercase tracking-[0.16em] text-gold">
          How to verify independently
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>
            Recompute the SHA-256 of your local copy of the artifact:{" "}
            <code className="font-mono">sha256sum &lt;file&gt;</code>. It must match
            the hash on this page byte-for-byte.
          </li>
          <li>
            For anchored rows, open the block link — the Bitcoin block header at
            that height, once buried under enough proof-of-work, cryptographically
            commits to a Merkle root that includes this hash via its{" "}
            <code className="font-mono">.ots</code> receipt.
          </li>
          <li>
            For full end-to-end proof, run{" "}
            <code className="font-mono">ots verify &lt;file&gt;.ots</code> against
            the same bytes. Lovable cannot fake this — the calendars and the
            Bitcoin blockchain are independent third parties.
          </li>
        </ol>
      </footer>
    </div>
  );
}

function Tile({
  label,
  value,
  tone = "muted",
}: {
  label: string;
  value: string;
  tone?: "measured" | "gold" | "muted";
}) {
  const cls =
    tone === "measured"
      ? "text-[color:var(--measured)] border-[color:var(--measured)]/40"
      : tone === "gold"
        ? "text-gold border-gold/40"
        : "text-foreground border-border";
  return (
    <div className={`border bg-background/60 p-3 ${cls}`}>
      <div className="text-[0.6rem] uppercase tracking-[0.18em] opacity-80">{label}</div>
      <div className="mt-1 font-mono text-2xl">{value}</div>
    </div>
  );
}
