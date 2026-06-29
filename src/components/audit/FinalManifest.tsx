// Golden Truth tile. Aggregates provenance + operator-recorded BTC anchors
// + Reclaim payload_cid into a single content-addressed manifest. Includes
// an honest anchor-entry form and a JSON download.

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  buildFinalManifest,
  type FinalManifest as ManifestT,
} from "@/lib/final-manifest";
import { recordAnchor, removeAnchor, subscribeAnchors } from "@/lib/anchors";

export function FinalManifest() {
  const [cid, setCid] = useState("…");
  const [m, setM] = useState<ManifestT | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ sha: "", height: "", txid: "" });
  const [otsText, setOtsText] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const refresh = useMemo(
    () => async () => {
      setBusy(true);
      try {
        const r = await buildFinalManifest();
        setM(r.manifest);
        setCid(r.cid);
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  useEffect(() => {
    void refresh();
    const off1 = subscribeAnchors(() => void refresh());
    // Also refresh when the reclaim ledger changes
    const h = () => void refresh();
    window.addEventListener("storage", h);
    return () => {
      off1();
      window.removeEventListener("storage", h);
    };
  }, [refresh]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      recordAnchor({
        sha256: form.sha.trim(),
        block_height: Number(form.height),
        txid: form.txid.trim() || undefined,
        source: "ots-verify",
      });
      setForm({ sha: "", height: "", txid: "" });
      setOtsText("");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "invalid input");
    }
  };

  // Parse `ots verify` stdout: extracts BTC block height + optional txid.
  // Matches phrasings like "Bitcoin block 955889 attests existence" and
  // "Bitcoin attestation in block 955889" and "txid <hex>".
  const parseOts = (text: string) => {
    const block = text.match(/(?:block|height)\s+(\d{4,})/i);
    const tx = text.match(/\b([a-f0-9]{64})\b/i);
    setOtsText(text);
    setErr(null);
    setForm((f) => ({
      ...f,
      height: block ? block[1] : f.height,
      txid: tx ? tx[1].toLowerCase() : f.txid,
    }));
  };

  const pendingShas = (m?.receipts ?? []).filter((r) => !r.anchor);

  const download = () => {
    if (!m) return;
    const blob = new Blob([JSON.stringify({ cid, ...m }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "final-manifest.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const tone =
    m?.coupling === "golden"
      ? "text-[color:var(--measured)] border-[color:var(--measured)]/40"
      : m?.coupling === "partial"
        ? "text-gold border-gold/40"
        : "text-muted-foreground border-border";

  return (
    <section className="border border-border bg-card/30 p-6">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[0.7rem] uppercase tracking-[0.18em] text-gold">
            Final Manifest · Golden Truth
          </div>
          <h3 className="mt-2 font-display text-lg text-foreground">
            One CID over every receipt + every BTC anchor + the payload state
          </h3>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={busy}
          className="border border-border px-2 py-1 text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground hover:text-gold disabled:opacity-50"
        >
          {busy ? "computing" : "recompute"}
        </button>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        OTS calendars are not CORS-readable; promotion from PENDING → ANCHORED
        is recorded by the operator after running{" "}
        <code className="font-mono">ots verify &lt;file&gt;.ots</code> locally.
        The anchor (block height + optional txid) is stored in your browser
        only and folded into the manifest CID — no fabrication, no fake green.
      </p>

      <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
        <div className={`border bg-background/60 p-3 ${tone}`}>
          <dt className="text-[0.6rem] uppercase tracking-[0.18em]">Coupling</dt>
          <dd className="mt-1 font-mono uppercase">{m?.coupling ?? "…"}</dd>
        </div>
        <div className="border border-border bg-background/60 p-3">
          <dt className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
            Anchored / Total
          </dt>
          <dd className="mt-1 font-mono text-foreground">
            {m ? `${m.anchored_count} / ${m.receipts_total}` : "…"}
          </dd>
        </div>
        <div className="border border-border bg-background/60 p-3">
          <dt className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
            Manifest CID
          </dt>
          <dd className="mt-1 break-all font-mono text-[0.7rem] text-foreground">{cid}</dd>
        </div>
      </dl>

      <div className="mt-3 border border-border bg-background/60 p-3">
        <div className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
          Reclaim payload_cid (state coupling)
        </div>
        <div className="mt-1 break-all font-mono text-[0.7rem] text-foreground">
          {m?.payload_cid ?? "…"}
        </div>
      </div>

      <div className="mt-5 border border-dashed border-border p-3">
        <label className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
          Paste <code className="font-mono">ots verify</code> output (auto-extracts block + txid)
        </label>
        <textarea
          aria-label="ots verify output"
          value={otsText}
          onChange={(e) => parseOts(e.target.value)}
          placeholder={"Success!\nBitcoin block 955889 attests existence as of 2026-06-28 PST"}
          rows={3}
          className="mt-1 w-full border border-border bg-background px-2 py-1 font-mono text-[0.7rem] text-foreground"
        />
      </div>

      <form
        onSubmit={submit}
        className="mt-3 grid gap-2 border border-dashed border-border p-3 sm:grid-cols-[1fr_140px_1fr_auto]"
      >
        <select
          aria-label="SHA-256 hash"
          value={form.sha}
          onChange={(e) => setForm({ ...form, sha: e.target.value })}
          className="border border-border bg-background px-2 py-1 font-mono text-[0.7rem] text-foreground"
        >
          <option value="">— pending sha256 —</option>
          {pendingShas.map((r) => (
            <option key={r.sha256} value={r.sha256}>
              {r.command} · {r.sha256.slice(0, 10)}…{r.sha256.slice(-6)}
            </option>
          ))}
        </select>
        <input
          aria-label="BTC block height"
          placeholder="block height"
          value={form.height}
          onChange={(e) => setForm({ ...form, height: e.target.value })}
          inputMode="numeric"
          className="border border-border bg-background px-2 py-1 font-mono text-[0.7rem] text-foreground"
        />
        <input
          aria-label="BTC txid (optional)"
          placeholder="txid (optional, 64 hex)"
          value={form.txid}
          onChange={(e) => setForm({ ...form, txid: e.target.value })}
          className="border border-border bg-background px-2 py-1 font-mono text-[0.7rem] text-foreground"
        />
        <button
          type="submit"
          className="border border-gold px-3 py-1 text-[0.65rem] uppercase tracking-[0.18em] text-gold"
        >
          record anchor
        </button>
        {err && (
          <div className="text-[0.65rem] text-destructive sm:col-span-4">{err}</div>
        )}
      </form>

      {m && (
        <ul className="mt-4 space-y-2">
          {m.receipts.map((r) => (
            <li
              key={r.sha256}
              className="flex flex-wrap items-center justify-between gap-2 border border-border bg-background/60 p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[0.6rem] uppercase tracking-[0.18em]">
                  <span className="border border-border px-2 py-0.5 text-foreground">
                    {r.subsystem}
                  </span>
                  <span className="font-mono normal-case tracking-normal text-foreground/70">
                    {r.command}
                  </span>
                </div>
                <div className="mt-1 break-all font-mono text-[0.7rem] text-foreground">
                  {r.sha256}
                </div>
                {r.anchor ? (
                  <div className="mt-1 font-mono text-[0.65rem] text-[color:var(--measured)]">
                    ANCHORED · block #{r.anchor.block_height}
                    {r.anchor.txid ? ` · tx ${r.anchor.txid.slice(0, 12)}…` : ""}
                  </div>
                ) : (
                  <div className="mt-1 font-mono text-[0.65rem] text-gold">
                    PENDING · awaiting BTC inclusion
                  </div>
                )}
              </div>
              {r.anchor && (
                <button
                  onClick={() => removeAnchor(r.sha256)}
                  className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground hover:text-destructive"
                >
                  unrecord
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <span className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
          Coupling green when every receipt is anchored AND payload_cid is stable.
        </span>
        <button
          onClick={download}
          disabled={!m}
          className="border border-border px-3 py-1 text-[0.6rem] uppercase tracking-[0.18em] text-foreground hover:text-gold disabled:opacity-50"
        >
          download final-manifest.json
        </button>
      </div>
    </section>
  );
}
