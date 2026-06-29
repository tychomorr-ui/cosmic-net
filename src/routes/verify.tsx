// Receipt Verifier — drop a .receipt.json (and optionally the original
// artifact) and the page re-derives every claim locally. No network.
// Honest greens only: each line says exactly what was checked.

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  isReceiptShape,
  verifyReceipt,
  type ReceiptBundle,
  type VerificationReport,
} from "@/lib/receipt-bundle";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "Receipt Verifier · Nexinus Terminus" },
      {
        name: "description",
        content:
          "Offline verifier for sovereign .receipt.json bundles. Recomputes SHA-256, CIDv1, and self-CID with no network calls.",
      },
      { property: "og:title", content: "Receipt Verifier · Nexinus Terminus" },
      {
        property: "og:description",
        content: "Drop a .receipt.json and the original artifact to re-derive every provenance claim locally.",
      },
    ],
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const [bundle, setBundle] = useState<ReceiptBundle | null>(null);
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const loadBundle = async (file: File) => {
    setErr(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!isReceiptShape(parsed)) throw new Error("not a nexinus.receipt/v1 bundle");
      setBundle(parsed);
      const r = await verifyReceipt(parsed);
      setReport(r);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "parse failed";
      setErr(msg);
      setBundle(null);
      setReport(null);
    }
  };

  const checkArtifact = async (file: File) => {
    if (!bundle) return;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const r = await verifyReceipt(bundle, bytes);
    setReport(r);
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <header className="border-b border-border pb-6">
        <div className="text-[0.7rem] uppercase tracking-[0.18em] text-gold">
          Verifier · Offline
        </div>
        <h1 className="mt-2 font-display text-3xl text-foreground">
          Receipt re-derivation
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Drop a <code className="font-mono">.receipt.json</code> minted by the
          /ops Receipt Wizard. The page re-hashes everything locally — no
          calendar calls, no fake green checks. Optionally drop the original
          artifact to confirm the bytes still match.
        </p>
      </header>

      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        <FileBox
          label="receipt bundle"
          accept="application/json,.json"
          onPick={loadBundle}
        />
        <FileBox
          label="original artifact (optional)"
          accept="*"
          disabled={!bundle}
          onPick={checkArtifact}
        />
      </section>

      {err && (
        <div className="mt-4 border border-destructive/40 bg-destructive/5 p-3 font-mono text-[0.7rem] text-destructive">
          {err}
        </div>
      )}

      {bundle && (
        <section className="mt-6 border border-border bg-card/30 p-4">
          <div className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
            Claimed
          </div>
          <dl className="mt-2 grid gap-2 text-[0.7rem]">
            <Row k="filename">{bundle.artifact.filename}</Row>
            <Row k="bytes">{bundle.artifact.bytes}</Row>
            <Row k="sha256">{bundle.artifact.sha256}</Row>
            <Row k="cid">{bundle.artifact.cid}</Row>
            <Row k="self_cid">{bundle.self_cid ?? "—"}</Row>
            <Row k="ots">
              {bundle.ots ? `${bundle.ots.filename} · ${bundle.ots.bytes} B` : "—"}
            </Row>
            <Row k="anchor">
              {bundle.anchor
                ? `block #${bundle.anchor.block_height}${bundle.anchor.txid ? ` · tx ${bundle.anchor.txid}` : ""}`
                : "—"}
            </Row>
          </dl>
        </section>
      )}

      {report && (
        <section className="mt-4 border border-border bg-card/30 p-4">
          <div className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
            Verification
          </div>
          <ul className="mt-2 space-y-1 font-mono text-[0.7rem]">
            <Check ok={report.shape_ok} label="bundle shape · nexinus.receipt/v1" />
            <Check ok={report.self_cid_ok} label="self_cid re-derives" />
            <Check
              ok={report.sha_match === true}
              pending={report.sha_match === "no-artifact"}
              label="artifact SHA-256 matches"
            />
            <Check
              ok={report.cid_match === true}
              pending={report.cid_match === "no-artifact"}
              label="artifact CIDv1 matches"
            />
            <Check
              ok={report.ots_size_match === true}
              pending={report.ots_size_match === "no-ots"}
              label=".ots base64 decodes to declared size"
            />
          </ul>
          {report.computed.sha256 && (
            <div className="mt-3 grid gap-1 text-[0.65rem]">
              <Row k="computed sha">{report.computed.sha256}</Row>
              <Row k="computed cid">{report.computed.cid ?? "—"}</Row>
            </div>
          )}
          {report.errors.length > 0 && (
            <ul className="mt-3 space-y-1 font-mono text-[0.65rem] text-destructive">
              {report.errors.map((e, i) => <li key={i}>· {e}</li>)}
            </ul>
          )}
          <p className="mt-3 text-[0.65rem] text-muted-foreground">
            BTC inclusion is reported as-recorded by the bundle author. To
            independently verify it, run <code className="font-mono">ots verify</code>{" "}
            on the .ots bytes (export with the download button below) and
            compare against a block explorer.
          </p>
          {bundle?.ots && (
            <button
              onClick={() => {
                const bin = atob(bundle.ots!.base64);
                const out = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
                const url = URL.createObjectURL(new Blob([out], { type: "application/octet-stream" }));
                const a = document.createElement("a");
                a.href = url;
                a.download = bundle.ots!.filename;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="mt-3 border border-gold px-3 py-1 text-[0.6rem] uppercase tracking-[0.18em] text-gold"
            >
              extract .ots
            </button>
          )}
        </section>
      )}
    </div>
  );
}

function FileBox({
  label,
  accept,
  disabled,
  onPick,
}: {
  label: string;
  accept: string;
  disabled?: boolean;
  onPick: (file: File) => void | Promise<void>;
}) {
  return (
    <label
      className={`block border border-dashed border-border bg-background/40 p-4 ${disabled ? "opacity-50" : ""}`}
    >
      <div className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <input
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={(e) => e.target.files?.[0] && void onPick(e.target.files[0])}
        className="mt-2 block w-full text-[0.7rem]"
      />
    </label>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-2 border border-border bg-background/60 p-2">
      <div className="text-[0.55rem] uppercase tracking-[0.18em] text-muted-foreground">{k}</div>
      <div className="break-all font-mono text-[0.7rem] text-foreground">{children}</div>
    </div>
  );
}

function Check({ ok, label, pending }: { ok: boolean; label: string; pending?: boolean }) {
  const tone = pending
    ? "text-muted-foreground"
    : ok
      ? "text-[color:var(--measured)]"
      : "text-destructive";
  const mark = pending ? "·" : ok ? "✓" : "✗";
  return (
    <li className={tone}>
      {mark} {label}
      {pending ? " · awaiting input" : ""}
    </li>
  );
}
