import { useEffect, useState } from "react";
import { createPublicClient, http, formatUnits } from "viem";
import { baseSepolia } from "viem/chains";
import { TRC_CONTRACT, TRC_ABI, explorerAddressUrl } from "@/data/truth-coin-contract";

export function ContractReceipt() {
  const address = TRC_CONTRACT.address;
  const [supply, setSupply] = useState<string | null>(null);
  const [transfers, setTransfers] = useState<boolean | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    setLoading(true);
    const client = createPublicClient({
      chain: baseSepolia,
      transport: http(TRC_CONTRACT.rpcUrl),
    });
    Promise.all([
      client.readContract({ address, abi: TRC_ABI, functionName: "totalSupply" }),
      client.readContract({ address, abi: TRC_ABI, functionName: "transfersEnabled" }),
    ])
      .then(([s, t]) => {
        if (cancelled) return;
        setSupply(formatUnits(s as bigint, TRC_CONTRACT.decimals));
        setTransfers(t as boolean);
      })
      .catch((e) => !cancelled && setErr(e?.shortMessage ?? e?.message ?? "read failed"))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [address]);

  return (
    <section className="border border-border bg-card/40 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[0.7rem] uppercase tracking-[0.18em] text-gold">
          On-chain receipt · {TRC_CONTRACT.chainName} · testnet
        </div>
        <div className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
          chain id {TRC_CONTRACT.chainId}
        </div>
      </div>
      <h2 className="mt-2 font-display text-2xl text-foreground">
        {address ? "Contract deployed · live totalSupply" : "Awaiting deploy · address pending"}
      </h2>

      {!address ? (
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Fill <span className="font-mono text-foreground">TRC_CONTRACT.address</span> in{" "}
          <span className="font-mono text-foreground">src/data/truth-coin-contract.ts</span> with the{" "}
          <span className="font-mono text-foreground">0x…</span> from{" "}
          <span className="font-mono text-foreground">forge create</span>. This panel will then show
          a live totalSupply readout and a Basescan button — the fourth Bitcoin-anchor-equivalent receipt.
        </p>
      ) : (
        <>
          <dl className="mt-5 grid gap-px border border-border bg-border sm:grid-cols-2">
            <Row k="Contract" v={address} mono />
            <Row k="Total supply" v={loading ? "…" : supply ? `${Number(supply).toLocaleString()} ${TRC_CONTRACT.symbol}` : err ? "read failed" : "—"} highlight />
            <Row k="Transfers" v={transfers === null ? "—" : transfers ? "enabled" : "soulbound (disabled)"} />
            <Row k="Standard" v="ERC-20 · soulbound-by-default" />
          </dl>

          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href={explorerAddressUrl(address)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 border border-gold px-4 py-2 text-[0.7rem] uppercase tracking-[0.18em] text-gold hover:bg-gold/10"
            >
              View on Basescan ↗
            </a>
            <button
              onClick={async () => {
                try { await navigator.clipboard.writeText(address); } catch { /* ignore */ }
              }}
              className="inline-flex items-center gap-2 border border-border px-4 py-2 text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
            >
              Copy address
            </button>
          </div>

          {err && (
            <p className="mt-3 text-xs text-destructive">RPC error: {err}</p>
          )}
        </>
      )}
    </section>
  );
}

function Row({ k, v, mono, highlight }: { k: string; v: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div className={`bg-card/60 px-4 py-3 ${highlight ? "border-l-2 border-gold" : ""}`}>
      <dt className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">{k}</dt>
      <dd className={`mt-1 break-all text-sm ${mono ? "font-mono" : ""} ${highlight ? "text-gold" : "text-foreground"}`}>{v}</dd>
    </div>
  );
}
