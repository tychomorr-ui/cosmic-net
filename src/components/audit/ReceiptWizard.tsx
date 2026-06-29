// Receipt Wizard — sovereign, honest, doctrine-consistent.
//
// Flow:
//   1. Drop an artifact file. We compute SHA-256 + CIDv1 in the browser.
//   2. Choose a stamping path:
//        (a) Local: run `ots stamp <file>` on your own machine, drop the
//            resulting .ots back in.
//        (b) Relay: POST to your sovereign relay (configurable below). The
//            relay forwards to OTS calendars server-side and returns the
//            .ots bytes. If unconfigured or unreachable, we say so — no
//            fake green.
//   3. Optionally record a BTC anchor (block height + txid) after running
//      `ots verify` locally. This is what flips PENDING → ANCHORED.
//   4. Download a .receipt.json bundle containing everything above.
//      Anyone can re-verify it offline at /verify.

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { sha256Hex, buildReceipt, type ReceiptBundle } from "@/lib/receipt-bundle";
import { bytesToCid } from "@/lib/cid";
import { getRelayUrl, setRelayUrl, clearRelayUrl, stampViaRelay } from "@/lib/relay-config";
import { recordAnchor, getAnchor, type Anchor } from "@/lib/anchors";

type Artifact = {
  file: File;
  bytes: Uint8Array;
  sha256: string;
  cid: string;
};

type Ots = { filename: string; bytes: Uint8Array };

async function readFile(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

export function ReceiptWizard() {
  const [artifact, setArtifact] = useState<Artifact | null>(null);
  const [ots, setOts] = useState<Ots | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [relay, setRelay] = useState<string>(getRelayUrl() ?? "");
  const [relayDraft, setRelayDraft] = useState<string>(getRelayUrl() ?? "");
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [block, setBlock] = useState("");
  const [txid, setTxid] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const h = () => setRelay(getRelayUrl() ?? "");
    window.addEventListener("nexinus:relay", h);
    return () => window.removeEventListener("nexinus:relay", h);
  }, []);

  useEffect(() => {
    if (!artifact) return;
    setAnchor(getAnchor(artifact.sha256) ?? null);
  }, [artifact]);

  const ingestArtifact = async (file: File) => {
    setErr(null);
    setBusy("hashing");
    try {
      const bytes = await readFile(file);
      const [sha, cid] = await Promise.all([sha256Hex(bytes), bytesToCid(bytes)]);
      setArtifact({ file, bytes, sha256: sha, cid });
      setOts(null);
      toast.success("Artifact hashed", { description: `${sha.slice(0, 12)}…${sha.slice(-8)}` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "read failed";
      setErr(msg);
    } finally {
      setBusy(null);
    }
  };

  const ingestOts = async (file: File) => {
    setErr(null);
    const bytes = await readFile(file);
    setOts({ filename: file.name, bytes });
    toast.success(".ots attached", { description: `${file.name} · ${bytes.length} B` });
  };

  const stampRelay = async () => {
    if (!artifact) return;
    if (!getRelayUrl()) {
      setErr("no relay configured");
      return;
    }
    setBusy("stamping via relay");
    setErr(null);
    try {
      const bytes = await stampViaRelay(artifact.sha256);
      setOts({ filename: `${artifact.file.name}.ots`, bytes });
      toast.success(".ots received from relay", { description: `${bytes.length} B` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "relay failed";
      setErr(`relay error: ${msg} — fall back to local \`ots stamp\``);
      toast.error("Relay stamp failed", { description: msg });
    } finally {
      setBusy(null);
    }
  };

  const saveRelay = () => {
    try {
      if (relayDraft.trim()) setRelayUrl(relayDraft);
      else clearRelayUrl();
      toast.success(relayDraft.trim() ? "Relay saved" : "Relay cleared");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "invalid url";
      setErr(msg);
    }
  };

  const recordBtcAnchor = () => {
    if (!artifact) return;
    setErr(null);
    try {
      const a = recordAnchor({
        sha256: artifact.sha256,
        block_height: Number(block),
        txid: txid.trim() || undefined,
        source: "ots-verify",
      });
      setAnchor(a);
      toast.success(`Anchor recorded · block #${a.block_height}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "bad input";
      setErr(msg);
      toast.error("Could not record anchor", { description: msg });
    }
  };

  const download = async () => {
    if (!artifact) return;
    setBusy("packing bundle");
    try {
      const bundle: ReceiptBundle = await buildReceipt({
        filename: artifact.file.name,
        bytes: artifact.bytes,
        ots: ots ?? undefined,
        anchor: anchor ?? undefined,
      });
      const blob = new Blob([JSON.stringify(bundle, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${artifact.file.name}.receipt.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Bundle exported", { description: bundle.self_cid?.slice(0, 16) + "…" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="border border-border bg-card/30 p-6">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[0.7rem] uppercase tracking-[0.18em] text-gold">
            Receipt Wizard · Sovereign Provenance
          </div>
          <h3 className="mt-2 font-display text-lg text-foreground">
            Hash · stamp · anchor · share
          </h3>
        </div>
        {busy && (
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
            {busy}…
          </span>
        )}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Every byte stays in your browser. The wizard computes SHA-256 + CIDv1
        locally, optionally calls <em>your</em> sovereign OTS relay, lets you
        record a BTC anchor after <code className="font-mono">ots verify</code>,
        and exports a self-verifying <code className="font-mono">.receipt.json</code>{" "}
        anyone can re-check at <a className="text-gold underline" href="/verify">/verify</a>.
      </p>

      {/* Step 1 — artifact */}
      <div className="mt-5 border border-dashed border-border p-3">
        <div className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
          1 · Artifact
        </div>
        <input
          type="file"
          aria-label="artifact file"
          onChange={(e) => e.target.files?.[0] && void ingestArtifact(e.target.files[0])}
          className="mt-2 block w-full text-[0.7rem] file:mr-3 file:border file:border-border file:bg-background file:px-2 file:py-1 file:text-[0.65rem] file:uppercase file:tracking-[0.16em] file:text-foreground"
        />
        {artifact && (
          <dl className="mt-3 grid gap-2 text-[0.7rem] sm:grid-cols-2">
            <Field k="filename">{artifact.file.name}</Field>
            <Field k="bytes">{artifact.bytes.length}</Field>
            <Field k="sha-256" wide>{artifact.sha256}</Field>
            <Field k="cidv1" wide>{artifact.cid}</Field>
          </dl>
        )}
      </div>

      {/* Step 2 — stamp */}
      <div className="mt-3 border border-dashed border-border p-3">
        <div className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
          2 · OpenTimestamps proof
        </div>
        <p className="mt-1 text-[0.7rem] text-muted-foreground">
          Either run <code className="font-mono">ots stamp {artifact?.file.name ?? "&lt;file&gt;"}</code>{" "}
          locally and drop the .ots here, or call your sovereign relay.
        </p>
        <input
          type="file"
          accept=".ots"
          aria-label="ots file"
          disabled={!artifact}
          onChange={(e) => e.target.files?.[0] && void ingestOts(e.target.files[0])}
          className="mt-2 block w-full text-[0.7rem] file:mr-3 file:border file:border-border file:bg-background file:px-2 file:py-1 file:text-[0.65rem] file:uppercase file:tracking-[0.16em] file:text-foreground disabled:opacity-50"
        />
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <input
            placeholder="https://your-relay.example/ots  (optional)"
            value={relayDraft}
            onChange={(e) => setRelayDraft(e.target.value)}
            className="border border-border bg-background px-2 py-1 font-mono text-[0.7rem] text-foreground"
          />
          <button
            onClick={saveRelay}
            className="border border-border px-3 py-1 text-[0.6rem] uppercase tracking-[0.18em] text-foreground hover:text-gold"
          >
            save relay
          </button>
          <button
            onClick={() => void stampRelay()}
            disabled={!artifact || !relay}
            className="border border-gold px-3 py-1 text-[0.6rem] uppercase tracking-[0.18em] text-gold disabled:opacity-40"
          >
            stamp via relay
          </button>
        </div>
        {relay && (
          <div className="mt-1 font-mono text-[0.6rem] text-muted-foreground">
            relay: <span className="text-foreground">{relay}</span>
          </div>
        )}
        {ots && (
          <div className="mt-2 font-mono text-[0.65rem] text-[color:var(--measured)]">
            .ots ready · {ots.filename} · {ots.bytes.length} B
          </div>
        )}
      </div>

      {/* Step 3 — anchor */}
      <div className="mt-3 border border-dashed border-border p-3">
        <div className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
          3 · BTC anchor (after `ots verify`)
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-[140px_1fr_auto]">
          <input
            inputMode="numeric"
            placeholder="block height"
            value={block}
            onChange={(e) => setBlock(e.target.value)}
            className="border border-border bg-background px-2 py-1 font-mono text-[0.7rem] text-foreground"
          />
          <input
            placeholder="txid (optional, 64 hex)"
            value={txid}
            onChange={(e) => setTxid(e.target.value)}
            className="border border-border bg-background px-2 py-1 font-mono text-[0.7rem] text-foreground"
          />
          <button
            onClick={recordBtcAnchor}
            disabled={!artifact || !block}
            className="border border-gold px-3 py-1 text-[0.6rem] uppercase tracking-[0.18em] text-gold disabled:opacity-40"
          >
            record anchor
          </button>
        </div>
        {anchor && (
          <div className="mt-2 font-mono text-[0.65rem] text-[color:var(--measured)]">
            ANCHORED · block #{anchor.block_height}
            {anchor.txid ? ` · tx ${anchor.txid.slice(0, 12)}…` : ""}
          </div>
        )}
      </div>

      {/* Step 4 — export */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <span className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
          Output: self-verifying .receipt.json (artifact + optional .ots + anchor)
        </span>
        <button
          onClick={() => void download()}
          disabled={!artifact}
          className="border border-gold px-3 py-1 text-[0.65rem] uppercase tracking-[0.18em] text-gold disabled:opacity-40"
        >
          download .receipt.json
        </button>
      </div>

      {err && (
        <div className="mt-3 border border-destructive/40 bg-destructive/5 p-2 font-mono text-[0.65rem] text-destructive">
          {err}
        </div>
      )}
    </section>
  );
}

function Field({ k, wide, children }: { k: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={`border border-border bg-background/60 p-2 ${wide ? "sm:col-span-2" : ""}`}>
      <div className="text-[0.55rem] uppercase tracking-[0.18em] text-muted-foreground">{k}</div>
      <div className="mt-0.5 break-all font-mono text-[0.7rem] text-foreground">{children}</div>
    </div>
  );
}
