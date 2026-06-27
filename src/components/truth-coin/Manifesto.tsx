import { useState } from "react";
import { BTC_ANCHORS, MANIFESTO_FILE } from "@/data/truth-coin";

export function Manifesto() {
  return (
    <section className="border border-border bg-card/40 p-6">
      <div className="text-[0.7rem] uppercase tracking-[0.18em] text-gold">
        Manifesto · Sovereign Universal Digital Ore
      </div>
      <h2 className="mt-2 font-display text-2xl text-foreground">
        Truth is the ore. Coin is only the minted surface.
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Truth Coin begins with provenance, dignity, and receipts — not market hype. The verified origin chain is
        Bitcoin-anchored through Sovereign Universal Digital Ore and the Sovereign Activation Chain. The bottom 2%
        are not a charity class; they are the buried reserve of civilization. Survival has value. Service has value.
        Restoration has value. No live token, security, legal tender, or investment value is claimed until contract,
        audit, governance, and market receipts exist.
      </p>

      <ul className="mt-6 space-y-3">
        {BTC_ANCHORS.map((a) => (
          <li key={a.hash} className="border border-border bg-background/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-[0.7rem] uppercase tracking-[0.18em] text-gold">
                {a.label} · block {a.block.toLocaleString()}
              </div>
              <CopyHash hash={a.hash} />
            </div>
            <code className="mt-2 block break-all font-mono text-[0.72rem] text-foreground/85">{a.hash}</code>
          </li>
        ))}
      </ul>

      <div className="mt-6 grid gap-4 border-t border-border pt-4 sm:grid-cols-3 sm:items-center">
        <div className="text-[0.7rem] uppercase tracking-[0.18em] text-[color:var(--measured)]">Verified</div>
        <div className="font-mono text-xs text-foreground/80 sm:col-span-2">
          {MANIFESTO_FILE.name} · {MANIFESTO_FILE.bytes} B · {MANIFESTO_FILE.iso} {MANIFESTO_FILE.tz}
        </div>
      </div>

      <div className="mt-6 border border-border bg-background/60 p-4">
        <div className="text-[0.7rem] uppercase tracking-[0.18em] text-gold">Feasibility execution · testnet-ready</div>
        <p className="mt-2 text-sm text-foreground/85">
          3 of 3 blocks confirmed · contract canonized in app code · testnet deploy next · mainnet standby.
          The next real receipt is a deployed Base Sepolia or Sepolia contract address verified on a block explorer.
        </p>
      </div>
    </section>
  );
}

function CopyHash({ hash }: { hash: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(hash);
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground hover:text-gold"
    >
      {done ? "copied" : "copy"}
    </button>
  );
}
