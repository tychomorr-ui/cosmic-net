import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { parseProvenance } from "@/lib/provenance";
import { getAnchor, subscribeAnchors, type Anchor } from "@/lib/anchors";
import { openProofHash } from "@/components/audit/ProofDeepLink";

function CopyShaButton({ sha }: { sha: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(sha);
          setCopied(true);
          toast.success("SHA-256 copied", { description: `${sha.slice(0, 12)}…${sha.slice(-8)}` });
          setTimeout(() => setCopied(false), 1200);
        } catch {
          toast.error("Clipboard unavailable");
        }
      }}
      className="shrink-0 border border-border px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground hover:text-gold"
    >
      {copied ? "copied" : "copy sha"}
    </button>
  );
}

export function ProvenanceReceipts() {
  const receipts = useMemo(() => parseProvenance(), []);
  const [, force] = useState(0);
  useEffect(() => subscribeAnchors(() => force((n) => n + 1)), []);

  // Modal is owned by the global ProofDeepLink; we just drive the URL hash.
  const openProof = (sha: string) => openProofHash(sha);

  return (
    <>
    <section className="border border-border bg-card/30 p-6">



      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-[0.7rem] uppercase tracking-[0.18em] text-gold">
            Provenance · OpenTimestamps receipts
          </div>
          <h3 className="mt-2 font-display text-lg text-foreground">
            Anchored hashes parsed from the ops ledger
          </h3>
        </div>
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
          {receipts.length} receipt{receipts.length === 1 ? "" : "s"}
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Extracted from <code className="font-mono">terminus-ops.json</code>. Verification requires
        running <code className="font-mono">ots verify &lt;file&gt;.ots</code> locally against the
        bytes that produced each hash — this UI cannot prove a BTC anchor on its own.
      </p>
      {receipts.length === 0 ? (
        <div className="mt-4 border border-dashed border-border p-4 text-xs text-muted-foreground">
          No SHA256/OTS markers present in the current ledger.
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {receipts.map((r, i) => (
            <li key={i} className="border border-border bg-background/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-[0.65rem] uppercase tracking-[0.18em]">
                  <span className="border border-border px-2 py-0.5 text-foreground">
                    {r.subsystem}
                  </span>
                  <span className="font-mono normal-case tracking-normal text-foreground/80">
                    {r.command}
                  </span>
                  <span
                    className={
                      r.verified
                        ? "text-[color:var(--measured)]"
                        : "text-gold"
                    }
                  >
                    {r.verified ? "VERIFIED" : "STAMPED · UNVERIFIED"}
                  </span>
                </div>
                <time className="font-mono text-[0.65rem] text-muted-foreground">{r.ts}</time>
              </div>

              {r.hashes.length > 0 && (
                <div className="mt-3">
                  <div className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
                    SHA-256
                  </div>
                  <ul className="mt-1 space-y-1">
                    {r.hashes.map((h) => {
                      const a: Anchor | undefined = getAnchor(h);
                      return (
                        <li key={h} className="border border-border bg-background/60 p-2">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <button
                              onClick={() => openProof(h, r)}
                              className="flex-1 break-all text-left font-mono text-[0.7rem] text-foreground transition-colors hover:text-gold"
                              title="Open proof detail"
                            >
                              {h}
                            </button>
                            <CopyShaButton sha={h} />
                          </div>
                          {a ? (
                            <button
                              onClick={() => openProof(h, r)}
                              className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-[color:var(--measured)] hover:underline"
                            >
                              ANCHORED · block #{a.block_height}
                              {a.txid ? ` · tx ${a.txid.slice(0, 12)}…` : ""} · view proof
                            </button>
                          ) : (
                            <button
                              onClick={() => openProof(h, r)}
                              className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-gold hover:underline"
                            >
                              PENDING · open proof detail
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {r.otsFiles.length > 0 && (
                <div className="mt-3">
                  <div className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
                    OTS files
                  </div>
                  <ul className="mt-1 flex flex-wrap gap-2">
                    {r.otsFiles.map((f) => (
                      <li
                        key={f}
                        className="border border-border px-2 py-0.5 font-mono text-[0.7rem] text-gold"
                      >
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
    <ProofDetailModal
      open={openCtx !== null}
      onOpenChange={(o) => !o && setOpenCtx(null)}
      context={openCtx}
    />
    </>
  );
}
