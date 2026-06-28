import { useRef, useState } from "react";
import { exportBundle, importBundle, downloadBundle, type ReclaimReceipt, type ImportReport, type ImportMode } from "@/lib/reclaim";

export function ReclaimExport() {
  const [receipt, setReceipt] = useState<ReclaimReceipt | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<ImportMode>("merge");
  const fileRef = useRef<HTMLInputElement>(null);

  const onExport = async () => {
    setErr(null); setBusy(true);
    try {
      const { bytes, receipt } = await exportBundle();
      downloadBundle(bytes, receipt.payload_cid);
      setReceipt(receipt);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  const onImport = async (file: File) => {
    setErr(null); setReport(null); setBusy(true);
    try {
      const text = await file.text();
      const r = await importBundle(text, mode);
      setReport(r);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  };

  return (
    <section className="border border-border bg-card/40 p-4">
      <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
        <div className="text-[0.7rem] uppercase tracking-[0.18em] text-gold">
          Reclaim · Export / Import
        </div>
        <span className="font-mono text-[0.6rem] text-muted-foreground">cmap.reclaim/v1</span>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Serialize <span className="text-foreground">truths · envelopes · truth-chain · ops-log</span> into a
        single canonical dag-json bundle. The CIDv1 is computed locally; anyone with the file can
        recompute and verify. Import re-instantiates state on any compatible mesh node.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={onExport}
          disabled={busy}
          className="border border-gold px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.18em] text-gold hover:bg-gold/10 disabled:opacity-50"
        >
          {busy ? "…" : "Export bundle"}
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="border border-border px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.18em] text-foreground hover:border-gold hover:text-gold disabled:opacity-50"
        >
          Import bundle
        </button>
        <label className="flex items-center gap-2 font-mono text-[0.65rem] text-muted-foreground">
          <span>mode</span>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as ImportMode)}
            className="border border-border bg-background px-1 py-0.5 text-foreground"
          >
            <option value="merge">merge</option>
            <option value="replace">replace</option>
          </select>
        </label>
        <input
          ref={fileRef}
          type="file"
          accept=".dagjson,.json,application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onImport(f);
            e.target.value = "";
          }}
        />
      </div>

      {receipt && (
        <div className="mt-4 border border-border bg-background/60 p-3 text-[0.7rem]">
          <div className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">Export receipt</div>
          <div className="mt-1 break-all font-mono text-foreground">{receipt.cid}</div>
          <div className="mt-1 font-mono text-muted-foreground">
            {receipt.bytes} bytes · truths {receipt.counts.truths} · envelopes {receipt.counts.envelopes} · chain {receipt.counts.truth_chain} · ops {receipt.counts.ops_log}
          </div>
        </div>
      )}

      {report && (
        <div className="mt-3 border border-border bg-background/60 p-3 text-[0.7rem]">
          <div className="text-[0.6rem] uppercase tracking-[0.18em] text-[color:var(--measured)]">
            Import {report.mode} · verified
          </div>
          <div className="mt-1 break-all font-mono text-foreground">{report.cid}</div>
          <div className="mt-1 font-mono text-muted-foreground">
            +{report.applied.truths} truths · +{report.applied.envelopes} envelopes · +{report.applied.truth_chain} chain · ops-log static
          </div>
        </div>
      )}

      {err && (
        <div className="mt-3 border border-destructive bg-background/60 p-3 font-mono text-[0.7rem] text-destructive">
          {err}
        </div>
      )}
    </section>
  );
}
