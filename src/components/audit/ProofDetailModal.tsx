// ProofDetailModal — COSMIC_CRAZE edition.
//
// Surfaces a single SHA-256 receipt with: copyable hash, BTC block anchor,
// CID nexus (golden truth + per-receipt CID), shareable snippet, evidence
// bundle download, and deep-link support via `#proof=<sha>`.
//
// Honest constraints:
//   - "Scan" animation is purely cosmetic on open and is labeled as such;
//     no fake network call is made.
//   - "Synced" status is true iff the local anchor map has this sha AND the
//     manifest counts it as anchored. Otherwise the badge shows PENDING.

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Copy, Download, Share2, Link2, ShieldCheck, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { valueToCid } from "@/lib/cid";
import { getAnchor, type Anchor } from "@/lib/anchors";
import { buildFinalManifest } from "@/lib/final-manifest";
import { buildProvenanceBundle, downloadProvenanceBundle } from "@/lib/provenance-bundle";

export type ProofContext = {
  sha256: string;
  docName: string;       // best-effort label (ots filename or command)
  subsystem?: string;
  ts?: string;
  otsFiles?: string[];
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: ProofContext | null;
};

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  } catch {
    toast.error("Clipboard unavailable");
  }
}

function btcExplorer(block: number) {
  return `https://mempool.space/block/${block}`;
}

export function ProofDetailModal({ open, onOpenChange, context }: Props) {
  const [scanning, setScanning] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [goldenCid, setGoldenCid] = useState<string>("…");
  const [receiptCid, setReceiptCid] = useState<string>("…");
  const [manifestSynced, setManifestSynced] = useState<boolean>(false);

  useEffect(() => {
    if (!open || !context) return;
    setScanning(true);
    const t = setTimeout(() => setScanning(false), 900);

    const a = getAnchor(context.sha256) ?? null;
    setAnchor(a);

    (async () => {
      try {
        const { manifest, cid } = await buildFinalManifest();
        setGoldenCid(cid);
        const match = manifest.receipts.find(
          (r) => r.sha256 === context.sha256.toLowerCase(),
        );
        setManifestSynced(!!match && !!match.anchor);
        const rcid = await valueToCid({
          sha256: context.sha256.toLowerCase(),
          docName: context.docName,
          ots: context.otsFiles ?? [],
          anchor: a,
        });
        setReceiptCid(rcid);
      } catch {
        setGoldenCid("error");
        setReceiptCid("error");
      }
    })();

    return () => clearTimeout(t);
  }, [open, context]);

  const shareSnippet = useMemo(() => {
    if (!context) return "";
    const blockPart = anchor ? `Bitcoin block ${anchor.block_height}` : "the sovereign ledger";
    return `I just verified ${context.docName} on the Cosmic Truth ledger. Immutable, sovereign, and anchored to ${blockPart}. #CosmicTruth #SovereignJustice`;
  }, [context, anchor]);

  if (!context) return null;

  const synced = !!anchor && manifestSynced;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-[color:var(--gold)]/40 bg-gradient-to-b from-[#04050a] via-[#070b1c] to-[#02030a] p-0 text-foreground">
        {/* Scan overlay */}
        {scanning && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-lg"
          >
            <div className="absolute inset-x-0 top-0 h-px animate-[scanline_0.9s_ease-out_forwards] bg-[color:var(--gold)] shadow-[0_0_24px_4px_var(--gold)]" />
            <style>{`@keyframes scanline { from { transform: translateY(0); opacity: 1 } to { transform: translateY(640px); opacity: 0 } }`}</style>
          </div>
        )}

        <div className="border-b border-border/60 px-6 py-5">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[0.65rem] uppercase tracking-[0.22em] text-gold">
                  Proof Detail · Cosmic Truth
                </div>
                <DialogTitle className="mt-1 font-display text-xl leading-tight">
                  {context.docName}
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs text-muted-foreground">
                  Local-only verification. No network reach-back; what you see is what is in this browser.
                </DialogDescription>
              </div>
              <span
                className={`flex shrink-0 items-center gap-1 border px-2 py-1 text-[0.6rem] uppercase tracking-[0.18em] ${
                  synced
                    ? "border-[color:var(--measured)] text-[color:var(--measured)]"
                    : "border-gold text-gold"
                }`}
              >
                <ShieldCheck className="!h-3 !w-3" />
                {synced ? "Verified · Immutable" : "Pending Anchor"}
              </span>
            </div>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-6 py-5">
          {/* Sovereign Hash */}
          <section>
            <div className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
              The Sovereign Hash · SHA-256
            </div>
            <div className="mt-2 flex items-start gap-2 rounded-md border border-[color:var(--gold)]/30 bg-black/60 p-3">
              <code className="flex-1 break-all font-mono text-[0.78rem] leading-relaxed text-[color:var(--gold)] [text-shadow:0_0_8px_color-mix(in_oklab,var(--gold)_60%,transparent)]">
                {context.sha256}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copy(context.sha256, "SHA-256")}
                className="h-7 px-2 text-[0.6rem] uppercase tracking-[0.18em]"
              >
                <Copy className="!h-3 !w-3" /> copy
              </Button>
            </div>
          </section>

          {/* Bitcoin Attestation */}
          <section>
            <div className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
              Bitcoin Block Anchor
            </div>
            {anchor ? (
              <a
                href={btcExplorer(anchor.block_height)}
                target="_blank"
                rel="noreferrer"
                className="mt-2 flex items-center justify-between rounded-md border border-[color:var(--measured)]/50 bg-black/40 p-3 transition-colors hover:border-[color:var(--measured)]"
              >
                <div>
                  <div className="font-mono text-sm text-[color:var(--measured)]">
                    Block #{anchor.block_height}
                  </div>
                  {anchor.txid && (
                    <div className="mt-0.5 break-all font-mono text-[0.65rem] text-muted-foreground">
                      tx {anchor.txid}
                    </div>
                  )}
                  <div className="mt-0.5 text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
                    recorded {new Date(anchor.anchored_at).toISOString()} · {anchor.source}
                  </div>
                </div>
                <ExternalLink className="!h-4 !w-4 text-muted-foreground" />
              </a>
            ) : (
              <div className="mt-2 rounded-md border border-dashed border-gold/40 bg-black/30 p-3 text-xs text-gold">
                No local anchor recorded yet. Stamp via OpenTimestamps and record the block height in
                the Final Manifest to promote this receipt.
              </div>
            )}
          </section>

          {/* CID Nexus */}
          <section>
            <div className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
              CID Nexus
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <CidTile label="Golden Truth CID" cid={goldenCid} />
              <CidTile label="Receipt CID" cid={receiptCid} />
            </div>
          </section>

          {/* OTS files */}
          {context.otsFiles && context.otsFiles.length > 0 && (
            <section>
              <div className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
                OTS Receipts
              </div>
              <ul className="mt-2 flex flex-wrap gap-2">
                {context.otsFiles.map((f) => (
                  <li
                    key={f}
                    className="border border-border bg-black/40 px-2 py-0.5 font-mono text-[0.7rem] text-gold"
                  >
                    {f}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Viral actions */}
          <section className="grid gap-2 border-t border-border/60 pt-4 sm:grid-cols-3">
            <Button
              variant="outline"
              onClick={() => copy(shareSnippet, "Share snippet")}
              className="justify-center"
            >
              <Share2 /> Share the Truth
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const { bundle, json } = await buildProvenanceBundle();
                  downloadProvenanceBundle(bundle, json);
                  toast.success("Evidence bundle exported");
                } catch {
                  toast.error("Export failed");
                }
              }}
              className="justify-center"
            >
              <Download /> Download Evidence
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const url = `${window.location.origin}${window.location.pathname}#proof=${context.sha256}`;
                copy(url, "Proof link");
              }}
              className="justify-center"
            >
              <Link2 /> Copy Proof Link
            </Button>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CidTile({ label, cid }: { label: string; cid: string }) {
  return (
    <button
      onClick={() => copy(cid, label)}
      className="group rounded-md border border-border bg-black/40 p-3 text-left transition-colors hover:border-gold"
    >
      <div className="flex items-center justify-between text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground group-hover:text-gold">
        {label}
        <Copy className="!h-3 !w-3 opacity-50 group-hover:opacity-100" />
      </div>
      <div className="mt-1 break-all font-mono text-[0.7rem] text-foreground/90">{cid}</div>
    </button>
  );
}
