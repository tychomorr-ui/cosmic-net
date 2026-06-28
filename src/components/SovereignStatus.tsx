// One-click sovereign attestation surface. Default state UNVERIFIED.
// Only an explicit { ok: true } from verifyNodeAttestation flips the
// PISTIFUS-VALIDATED sigil. Any throw or non-true result → UNVERIFIED.

import { useState } from "react";
import { verifyNodeAttestation, type AttestationResult } from "@/lib/attestation";

export function SovereignStatus({
  nodeId,
  label,
}: {
  nodeId: string;
  label?: string;
}) {
  const [result, setResult] = useState<AttestationResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const r = await verifyNodeAttestation(nodeId);
      setResult(r);
    } catch (e) {
      setResult({
        ok: false,
        cid: "",
        reachable: false,
        drift: e instanceof Error ? e.message : "verify threw",
        checkedAt: Date.now(),
      });
    } finally {
      setBusy(false);
    }
  }

  const ok = result?.ok === true;

  return (
    <div className="space-y-2 border border-border bg-background/40 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[0.62rem] uppercase tracking-[0.22em] text-muted-foreground">
          {label ?? nodeId} · sovereign attestation
        </div>
        <Sigil ok={ok} pending={result === null} />
      </div>
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="w-full rounded border border-primary/50 bg-primary/5 px-3 py-1.5 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-primary transition hover:bg-primary/10 disabled:opacity-40"
      >
        {busy ? "verifying…" : result ? "re-verify" : "verify now"}
      </button>
      {result && (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[0.62rem]">
          <Row k="reachable" v={result.reachable ? "yes" : "no"} good={result.reachable} />
          <Row k="cid" v={result.cid ? result.cid.slice(0, 18) + "…" : "—"} good={!!result.cid} />
          <Row k="drift" v={result.drift ?? "none"} good={result.drift === null} />
          <Row k="checked" v={new Date(result.checkedAt).toISOString().slice(11, 19) + "Z"} good />
        </dl>
      )}
    </div>
  );
}

function Sigil({ ok, pending }: { ok: boolean; pending: boolean }) {
  if (pending) {
    return (
      <span className="rounded border border-border px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
        UNVERIFIED
      </span>
    );
  }
  if (ok) {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-primary bg-primary/10 px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-primary">
        <span aria-hidden>◬</span> PISTIFUS-VALIDATED
      </span>
    );
  }
  return (
    <span className="rounded border border-destructive/60 bg-destructive/10 px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-destructive">
      UNVERIFIED
    </span>
  );
}

function Row({ k, v, good }: { k: string; v: string; good: boolean }) {
  return (
    <>
      <dt className="text-muted-foreground">{k}</dt>
      <dd className={good ? "text-foreground" : "text-destructive"}>{v}</dd>
    </>
  );
}
