import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { type BtcSample, loadSamples, pushSample, sampleSubstrate, stamp } from "@/lib/btc-substrate";

export const Route = createFileRoute("/sudo-coin")({
  head: () => ({
    meta: [
      { title: "Truth Substrate · Truth Coin · Live BTC Readout" },
      { name: "description", content: "Truth Substrate (formerly SUDO): composite read of Bitcoin's unattributed substrate via public endpoints. Sovereign attestation, Pistifus-weighted." },
      { property: "og:title", content: "Truth Substrate · Nexinus Terminus" },
      { property: "og:description", content: "Work · pressure · density · supply. The substrate is the Truth Coin asset, viewed honestly." },
    ],
    links: [{ rel: "canonical", href: "/sudo-coin" }],
  }),
  component: SudoPage,
});

const ATTESTED_RATE = 0.0000021;        // USD per H × pressure unit (illustrative, manifesto art. VIII)
const CADENCE_MS = 90_000;

function SudoPage() {
  const [samples, setSamples] = useState<BtcSample[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setSamples(loadSamples()); }, []);

  async function refresh() {
    setLoading(true); setErr(null);
    try { setSamples(pushSample(await sampleSubstrate())); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), CADENCE_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const latest = samples[samples.length - 1];
  const cumSudo = useMemo(
    () => samples.reduce((s, x) => s + x.oreIndex, 0),
    [samples],
  );
  const attestedUsd = cumSudo * ATTESTED_RATE * 1_000_000;
  const oreRate = latest ? latest.oreIndex : 0;
  const sparkPath = useMemo(() => sparkline(samples.map((s) => s.oreIndex), 320, 48), [samples]);
  const coupling = useMemo(() => correlation(
    samples.map((s) => s.oreIndex), samples.map((s) => s.priceUsd),
  ), [samples]);

  const certHash = latest ? stamp(latest) : "————————";

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-6 py-10 font-mono">
      <header className="border-b border-border pb-6">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-3xl text-primary">◈</span>
          <span className="text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground">TRUTH //</span>
          <span className="font-display text-base tracking-[0.2em] text-foreground">TRUTH_SUBSTRATE · SOVEREIGN READOUT</span>
        </div>
        <h1 className="mt-3 text-sm uppercase tracking-[0.18em] text-primary">truth substrate — the asset beneath the coin</h1>
        <p className="mt-2 max-w-3xl text-xs text-muted-foreground">
          composite read of bitcoin's unattributed substrate. real public endpoints. sovereign attestation,
          pistifus-weighted. the substrate is the truth coin asset, viewed honestly.
        </p>
        <div className="mt-4 flex flex-wrap gap-px border border-border bg-border">
          <div className="bg-background/60 px-4 py-2"><span className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">streaming</span><span className="ml-2 text-foreground">{samples.length} sample{samples.length === 1 ? "" : "s"}</span></div>
          <div className="bg-background/60 px-4 py-2"><span className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">cadence</span><span className="ml-2 text-foreground">{CADENCE_MS / 1000}s</span></div>
          <div className="bg-background/60 px-4 py-2"><span className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">truth mirror</span><span className="ml-2 text-primary">FNV-1a</span></div>
        </div>
      </header>

      <section className="border border-border bg-background/30 p-5">
        <Label a="SCOPE" b="" />
        <p className="mt-2 text-xs text-foreground/85">
          this surface measures and attests to a composite signal woven through bitcoin's network state — work, pressure, density, supply.
          it does not assert title to anyone else's coins. the "ore" is a sovereign-attestable derivative reading, useful as a thesis,
          a watermark, or an instrument you publish under your own name. see manifesto · article IX.
        </p>
      </section>

      <section className="border border-border bg-background/30 p-5">
        <div className="flex items-baseline justify-between">
          <Label a="LIVE" b="CORE READOUT" />
          <button onClick={refresh} disabled={loading} className="border border-primary bg-primary/10 px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-primary hover:bg-primary/20 disabled:opacity-40">
            {loading ? "…probing" : "↻ refresh"}
          </button>
        </div>
        {err && <div className="mt-3 border border-destructive/60 p-2 text-xs text-destructive">{err}</div>}
        <div className="mt-2 text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
          block {latest?.block.height.toLocaleString() ?? "—"} · hash {latest ? latest.block.hash.slice(0, 8).toUpperCase() : "————"}
        </div>
        <div className="mt-5 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          <Tile k="btc price" v={fmtUsd(latest?.priceUsd)} />
          <Tile k="market cap" v={latest ? `$${(latest.marketCapUsd / 1e9).toFixed(1)}B` : "—"} />
          <Tile k="block height" v={latest?.block.height.toLocaleString() ?? "—"} />
          <Tile k="circ. supply" v={latest ? `${(latest.supplyBtc / 1e6).toFixed(3)}M BTC` : "—"} />
          <Tile k="hashrate" v={latest ? `${(latest.hashrate / 1e18).toFixed(2)} EH/s` : "—"} />
          <Tile k="difficulty" v={latest ? `${(latest.difficulty / 1e12).toFixed(2)} T` : "—"} />
          <Tile k="mempool tx" v={latest?.mempool.count.toLocaleString() ?? "—"} />
          <Tile k="mempool vbytes" v={latest ? `${(latest.mempool.vsize / 1e6).toFixed(2)} MvB` : "—"} />
          <Tile k="last block tx" v={latest?.block.tx_count.toLocaleString() ?? "—"} />
          <Tile k="last block size" v={latest ? `${Math.round(latest.block.size / 1024)} KB` : "—"} />
          <Tile k="work index" v={latest ? latest.work.toFixed(3) : "—"} />
          <Tile k="pressure index" v={latest ? latest.pressure.toFixed(3) : "—"} />
        </div>
      </section>

      <section className="border border-border bg-background/30 p-5">
        <Label a="RESIDUAL" b="COEFFICIENTS" />
        <div className="mt-1 text-[0.62rem] uppercase tracking-[0.2em] text-muted-foreground">WORK · PRESSURE · DENSITY</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Coeff label="WORK" v={latest?.work ?? 0} max={22} />
          <Coeff label="PRESSURE" v={latest?.pressure ?? 0} max={50} />
          <Coeff label="DENSITY" v={latest?.density ?? 0} max={2} />
        </div>
      </section>

      <section className="border border-border bg-background/30 p-5">
        <Label a="ORE ACCUMULATION METER" b="local samples · operator-owned" />
        <div className="mt-4 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          <Tile k="cumulative SUDO" v={cumSudo.toFixed(3)} accent />
          <Tile k="attested value" v={`$${attestedUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
          <Tile k="current ore rate" v={oreRate.toFixed(3)} />
          <Tile k="series depth" v={String(samples.length)} />
        </div>
        <div className="mt-5">
          {samples.length >= 2 ? (
            <svg viewBox="0 0 320 48" className="h-12 w-full">
              <path d={sparkPath} fill="none" stroke="var(--primary)" strokeWidth="1.5" />
            </svg>
          ) : (
            <div className="text-xs text-muted-foreground">awaiting 2+ samples for spark trace…</div>
          )}
        </div>
      </section>

      <section className="border border-border bg-background/30 p-5">
        <Label a="MINING FIELD" b="OMNIPRESENT SUBSTRATE" />
        <div className="mt-4 break-all font-display text-base leading-relaxed text-primary/80" style={{ filter: latest ? `brightness(${0.6 + Math.min(1, latest.pressure / 20)})` : undefined }}>
          {GLYPH_FIELD}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          each glyph is a unit of substrate. brightness scales with mempool pressure and per-block density.
          the field is always there — most observers walk past it.
        </p>
      </section>

      <section className="border border-primary/40 bg-background/40 p-6">
        <Label a="UNIVERSAL ORE" b="CERTIFICATE OF ATTESTATION" />
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_2fr]">
          <div className="font-display text-5xl text-primary">{certHash}</div>
          <div className="space-y-1 text-xs">
            <Row k="instrument" v="SUDO-COIN · attestation · tesseract terminus" />
            <Row k="attestor" v="Tyler Morris · Nexinus RI Systems LLC" />
            <Row k="block" v={latest?.block.height.toString() ?? "—"} />
            <Row k="cumulative" v={`${cumSudo.toFixed(3)} SUDO`} />
            <Row k="usd attested" v={`$${attestedUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
            <Row k="substrate"
              v={latest ? `work=${latest.work.toFixed(3)} · pressure=${latest.pressure.toFixed(3)} · density=${latest.density.toFixed(3)} · supply^0.25=${Math.pow(latest.supplyBtc, 0.25).toFixed(2)}` : "—"} />
            <Row k="attested" v={latest ? new Date(latest.ts).toUTCString() : "—"} />
            <div className="mt-2 border border-primary/60 px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-primary">⌬ TRUTH MIRROR VALIDATED</div>
          </div>
        </div>
      </section>

      <section className="border border-border bg-background/30 p-5">
        <Label a="INTRINSIC COUPLING" b="ore ↔ asset" />
        <div className="mt-3 text-xs text-foreground/85">
          {samples.length >= 2
            ? <>pearson correlation across {samples.length} samples: <span className="font-display text-primary">{coupling.toFixed(3)}</span> · {Math.abs(coupling) > 0.6 ? "strongly coupled — the substrate is the asset" : "decoupled — keep sampling"}</>
            : "need 2+ samples to compute coupling…"}
        </div>
      </section>

      <SudoManifesto />
    </div>
  );
}

const GLYPH_FIELD = "◇◆◈⬡⌬⛬◇◆⌬⛬◇◆◈⬡⌬⛬◈⬡◆◈⬡⌬⛬◈⬡⌬⛬◇◆◈⬡◇◆◈⬡⌬◈⬡◇◆◈⬡⌬⛬◇◆⌬⛬◇◆◈⬡⌬⛬⛬◇◆◈⬡⌬⛬◈⬡⌬⛬◇◆◈⬡◇◆◈◇◆◈⬡◇◆◈⬡⌬⛬◇◆⌬⛬◇◆◈⬡◆◈⛬◇◆◈⬡⌬⛬◈⬡⌬⛬◇◆◈⬡◇⌬⛬◇◆◈⬡◇◆◈⬡⌬⛬◇◆⌬⛬◇◆⛬◇◆◈⛬◇◆◈⬡⌬⛬◈⬡⌬⛬◇◆◈◇⬡⌬⛬◇◆◈⬡◇◆◈⬡⌬⛬◇◆⌬⛬";

function Label({ a, b }: { a: string; b: string }) {
  return (
    <div className="flex items-baseline gap-2 text-[0.62rem] uppercase tracking-[0.22em]">
      <span className="text-primary">{a}</span>
      {b && <><span className="text-border">//</span><span className="text-foreground">{b}</span></>}
    </div>
  );
}
function Tile({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="bg-background/50 p-4">
      <div className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">{k}</div>
      <div className={`mt-1 font-display text-2xl ${accent ? "text-primary" : "text-foreground"}`}>{v}</div>
    </div>
  );
}
function Coeff({ label, v, max }: { label: string; v: number; max: number }) {
  const pct = Math.min(100, (v / max) * 100);
  return (
    <div className="border border-border bg-background/50 p-3">
      <div className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-xl text-foreground">{v.toFixed(3)}</div>
      <div className="mt-2 h-1 w-full bg-border"><div className="h-full bg-primary" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-b border-border/50 py-1">
      <span className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">{k}</span>
      <span className="break-all font-mono text-foreground/90">{v}</span>
    </div>
  );
}
function fmtUsd(n?: number) {
  if (n == null) return "—";
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
function sparkline(vals: number[], w: number, h: number): string {
  if (vals.length < 2) return "";
  const min = Math.min(...vals); const max = Math.max(...vals);
  const range = max - min || 1;
  return vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
}
function correlation(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  const mx = xs.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const my = ys.slice(0, n).reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx; const b = ys[i] - my;
    num += a * b; dx += a * a; dy += b * b;
  }
  const d = Math.sqrt(dx * dy);
  return d === 0 ? 0 : num / d;
}

function SudoManifesto() {
  const articles = [
    ["EXISTENCE", "Every digital asset carries a substrate larger than its directly transacted units — work expended, pressure absorbed, density emitted, supply accreted. The substrate is not noise around the asset. It is the asset, viewed honestly."],
    ["RESIDUAL", "The market prices the unit. It does not price the substrate. The gap between unit-price and substrate-truth is the Universal Digital Ore."],
    ["QUANTIFICATION", "The ore is computable from public network readings: log-work × mempool pressure × per-block density × supply^¼. The function is open, deterministic, and lives on the operator's hardware."],
    ["ATTESTATION", "A sovereign entity that reads, names, and hashes the substrate at a given block is the first to attest to that reading. Attestation is not custody. Attestation is testimony, hashed and dated."],
    ["COUPLING", "When the ore index and the asset price are strongly correlated, the asset cannot be discounted without discounting the ore. Coupling is the proof that the substrate is the asset, not a derivative of it."],
    ["TRUTH MIRROR", "No attestation is binding until reflected in the Tesseract Truth Mirror — a deterministic hash that the issuer alone can regenerate and that any observer can verify, without a vendor in the loop."],
    ["ECONOMIC IMPLICATION", "If the ore is real, then market capitalization is a partial accounting. The full accounting includes substrate-value, and the substrate-value is observable in real time. Every chain has it. Bitcoin has the most of it."],
    ["ATTESTED VALUE RATE", "One SUDO is a unit of sovereign attestation over the bitcoin substrate, converted to USD at a published rate floor. The rate is illustrative until the attestor publishes it under their own name and others adopt it. SUDO-COIN is the unit; the manifesto is the instrument."],
    ["SCOPE (HONEST)", "This manifesto asserts the right to read, attest, and publish — not the right to seize. The sovereign claim is over the reading, the hash, the certificate. Title to anyone else's coins is not implied and is not the point. The point is that the substrate was always there, and now it is named."],
  ];
  const r = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];
  return (
    <section className="border border-border bg-background/20 p-6">
      <Label a="SUDO-COIN" b="MANIFESTO" />
      <ol className="mt-5 space-y-4">
        {articles.map(([t, b], i) => (
          <li key={t} className="border-l-2 border-primary/40 pl-4">
            <div className="text-[0.62rem] uppercase tracking-[0.22em] text-primary">{r[i]}. {t}</div>
            <p className="mt-1 text-xs leading-relaxed text-foreground/85">{b}</p>
          </li>
        ))}
      </ol>
      <div className="mt-6 border-t border-border pt-3 text-[0.6rem] uppercase tracking-[0.22em] text-muted-foreground">
        RATIFIED BY TYLER MORRIS · NEXINUS RI SYSTEMS LLC · KETHER_GATE · SUDO-COIN LEDGER · v1.0.0
      </div>
    </section>
  );
}
