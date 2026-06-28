import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { loadOre } from "@/lib/ore";
import { loadSamples, sampleSubstrate, pushSample, type BtcSample } from "@/lib/btc-substrate";
import { loadChain } from "@/data/truth-chain";
import { NODES } from "@/data/nodes";
import { valueToCid } from "@/lib/cid";

export const Route = createFileRoute("/seventh-dimension")({
  head: () => ({
    meta: [
      { title: "Seventh Dimension · Unification Surface" },
      { name: "description", content: "The 7D unifier: Digital Ore × SUDO-COIN × Truth Chain × Resonate-Earth, projected as a single sovereign axis." },
      { property: "og:title", content: "Seventh Dimension · Nexinus Terminus" },
      { property: "og:description", content: "Refined ore, attested substrate, and planetary resonance — one CID, one witness, one axis." },
    ],
  }),
  component: SeventhDimensionPage,
});

const AXES = [
  { id: "ore", label: "ORE", glyph: "⛬", desc: "intellectual byproduct" },
  { id: "sudo", label: "SUDO", glyph: "◈", desc: "chain substrate" },
  { id: "chain", label: "CHAIN", glyph: "◇", desc: "truth links" },
  { id: "earth", label: "EARTH", glyph: "⬡", desc: "planetary resonance" },
  { id: "pam", label: "PAM", glyph: "♕", desc: "lane discipline" },
  { id: "kether", label: "KETHER", glyph: "⊕", desc: "operator key" },
  { id: "axis", label: "AXIS", glyph: "◬", desc: "the unifier" },
] as const;

function SeventhDimensionPage() {
  const [sample, setSample] = useState<BtcSample | null>(null);
  const [oreCount, setOreCount] = useState(0);
  const [oreDou, setOreDou] = useState(0);
  const [chainLen, setChainLen] = useState(0);
  const [unityCid, setUnityCid] = useState<string>("");
  const [tick, setTick] = useState(0);
  const [rot, setRot] = useState(0);

  useEffect(() => {
    const ore = loadOre();
    setOreCount(ore.length);
    setOreDou(ore.reduce((s, x) => s + x.dou, 0));
    setChainLen(loadChain().length);
    const last = loadSamples().slice(-1)[0];
    if (last) setSample(last);
    if (!last) void (async () => {
      try { setSample(pushSample(await sampleSubstrate()).slice(-1)[0]); } catch { /* offline */ }
    })();
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    // 8-fold resonance: rotation advances by 360/8 = 45° each beat, smoothed.
    const r = setInterval(() => setRot((x) => (x + 0.6) % 360), 40);
    return () => { clearInterval(t); clearInterval(r); };
  }, []);

  const resonateNode = NODES.find((n) => n.id === "resonate-earth");

  // Unity CID: hash the cross-axis snapshot. Recomputable, verifiable.
  useEffect(() => {
    const snapshot = {
      v: "7d.unity/v0",
      ore: { count: oreCount, dou: +oreDou.toFixed(2) },
      sudo: sample ? {
        block: sample.block.height,
        oreIndex: +sample.oreIndex.toFixed(4),
        priceUsd: sample.priceUsd,
      } : null,
      chain: { links: chainLen },
      earth: { node: resonateNode?.id ?? null, declared: resonateNode?.declared ?? null },
    };
    void valueToCid(snapshot).then(setUnityCid);
  }, [oreCount, oreDou, sample, chainLen, resonateNode]);

  // Heptagram vertex projection.
  const r = 140;
  const cx = 175, cy = 175;
  const vertices = AXES.map((_, i) => {
    const angle = (Math.PI * 2 * i) / AXES.length - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });
  // Heptagram star: connect every (n+3) vertex.
  const star = vertices.map((v, i) => {
    const next = vertices[(i + 3) % vertices.length];
    return `M${v.x.toFixed(1)} ${v.y.toFixed(1)} L${next.x.toFixed(1)} ${next.y.toFixed(1)}`;
  }).join(" ");
  const ring = vertices.map((v, i) => `${i === 0 ? "M" : "L"}${v.x.toFixed(1)} ${v.y.toFixed(1)}`).join(" ") + " Z";

  const phase = (tick % 7);
  const activeAxis = AXES[phase];

  const oreActivity = Math.min(1, oreCount / 20);
  const sudoActivity = sample ? Math.min(1, sample.pressure / 20) : 0;
  const chainActivity = Math.min(1, chainLen / 7);

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-6 py-10 font-mono">
      <header className="border-b border-border pb-6">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-3xl text-primary">◬</span>
          <span className="text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground">7D //</span>
          <span className="font-display text-base tracking-[0.2em] text-foreground">SEVENTH_DIMENSION · UNIFICATION_SURFACE</span>
        </div>
        <h1 className="mt-3 text-sm uppercase tracking-[0.18em] text-primary">one axis · seven projections</h1>
        <p className="mt-2 max-w-3xl text-xs text-muted-foreground">
          the seventh-dimensional projection collapses ore (operator byproduct), sudo (chain substrate),
          truth-chain links, resonate-earth resonance, pam lane discipline, and kether key custody onto a single
          recomputable witness. nothing here is novel state — it is the existing local sovereign field, seen as one.
        </p>
        <div className="mt-4 flex flex-wrap gap-px border border-border bg-border">
          <Cell k="unity cid" v={unityCid ? unityCid.slice(0, 14) + "…" : "computing"} />
          <Cell k="phase" v={`${phase + 1} · ${activeAxis.label}`} />
          <Cell k="axes" v="7" />
          <Cell k="resonance" v={`8 · ${pulse8}`} />
          <Cell k="cadence" v="1Hz · ⟲ 25fps" />
        </div>
        <TruthChainOrgBanner cid={unityCid} />
      </header>

      <section className="grid gap-px border border-border bg-border md:grid-cols-[1fr_1.2fr]">
        <div className="bg-background/30 p-6">
          <Label a="HEPTAGRAM" b="HOLOGRAPHIC PROJECTION · ⟲ ROTATING" />
          <svg viewBox="0 0 350 350" className="mt-4 w-full">
            <g transform={`rotate(${rot.toFixed(2)} ${cx} ${cy})`} style={{ transformOrigin: `${cx}px ${cy}px` }}>
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth="1" />
              {/* counter-rotating phantom ring — duality */}
              <g transform={`rotate(${(-rot * 1.618).toFixed(2)} ${cx} ${cy})`}>
                <circle cx={cx} cy={cy} r={r - 10} fill="none" stroke="var(--primary)" strokeWidth="0.5" opacity="0.25" strokeDasharray="2 6" />
              </g>
              <path d={ring} fill="none" stroke="var(--border)" strokeWidth="1" />
              <path d={star} fill="none" stroke="var(--primary)" strokeWidth="1.2" opacity={0.55 + 0.35 * (pulse8 / 8)} />
              {vertices.map((v, i) => {
                const isActive = i === phase;
                return (
                  <g key={i}>
                    <circle cx={v.x} cy={v.y} r={isActive ? 8 + pulse8 * 0.4 : 4}
                      fill={isActive ? "var(--primary)" : "var(--background)"}
                      stroke="var(--primary)" strokeWidth="1.5"
                      opacity={isActive ? 1 : 0.6 + 0.4 * (pulse8 / 8)} />
                    {/* counter-rotate text so labels stay readable */}
                    <g transform={`rotate(${(-rot).toFixed(2)} ${v.x} ${v.y})`}>
                      <text x={v.x} y={v.y - 16} textAnchor="middle"
                        fill={isActive ? "var(--primary)" : "var(--foreground)"}
                        style={{ fontFamily: "var(--font-display)", fontSize: 11, letterSpacing: 2 }}>
                        {AXES[i].glyph} {AXES[i].label}
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>
            <text x={cx} y={cy - 4} textAnchor="middle" fill="var(--primary)"
              style={{ fontFamily: "var(--font-display)", fontSize: 14, letterSpacing: 4 }}>◬</text>
            <text x={cx} y={cy + 12} textAnchor="middle" fill="var(--muted-foreground)"
              style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: 2 }}>UNITY · 8</text>
          </svg>
        </div>

        <div className="space-y-px bg-border">
          <AxisRow glyph="⛬" name="ORE" desc="operator-refined byproduct" v={`${oreCount} claims · ${oreDou.toFixed(2)} DOU`} activity={oreActivity} href="/digital-ore" />
          <AxisRow glyph="◈" name="SUDO" desc="bitcoin substrate read" v={sample ? `block ${sample.block.height.toLocaleString()} · ore=${sample.oreIndex.toFixed(2)}` : "awaiting sample"} activity={sudoActivity} href="/sudo-coin" />
          <AxisRow glyph="◇" name="CHAIN" desc="truth-chain links enrolled" v={`${chainLen} link${chainLen === 1 ? "" : "s"}`} activity={chainActivity} href="/fleet" />
          <AxisRow glyph="⬡" name="EARTH" desc="resonate-earth.live" v={resonateNode?.declared ?? "—"} activity={0.5} href="/nebula" />
          <AxisRow glyph="♕" name="PAM" desc="lane discipline ledger" v="CID-chained envelopes" activity={0.7} href="/pam" />
          <AxisRow glyph="⊕" name="KETHER" desc="operator key custody" v="ed25519 · browser-local" activity={1} href="/gateway" />
          <AxisRow glyph="◬" name="AXIS" desc="the unifier" v="this surface" activity={Math.max(oreActivity, sudoActivity, chainActivity)} href="/seventh-dimension" />
        </div>
      </section>

      <section className="border border-primary/40 bg-background/40 p-6">
        <Label a="UNITY CERTIFICATE" b="recomputable · operator-owned" />
        <p className="mt-2 max-w-3xl text-xs text-foreground/85">
          A single CIDv1 (dag-json · sha-256) over the cross-axis snapshot. Any observer with the same local state regenerates the same CID. No vendor in the loop.
        </p>
        <div className="mt-4 border border-border bg-background/60 p-4 font-mono text-xs break-all text-primary">
          {unityCid || "computing…"}
        </div>
        <div className="mt-3 grid gap-px border border-border bg-border sm:grid-cols-4">
          <Cell k="ore claims" v={String(oreCount)} />
          <Cell k="cum DOU" v={oreDou.toFixed(2)} />
          <Cell k="sudo block" v={sample?.block.height.toLocaleString() ?? "—"} />
          <Cell k="chain links" v={String(chainLen)} />
        </div>
      </section>

      <section className="border border-border bg-background/30 p-6">
        <Label a="DOCTRINE" b="X. UNIFICATION" />
        <p className="mt-3 text-sm leading-relaxed text-foreground/85">
          The seventh dimension is not a new place. It is the seventh way of looking at what was already here:
          ore that you refined, substrate that the chain was always emitting, links that your operator key signed,
          resonance that the planet was always carrying, lanes that pam held, and the kether key that holds them all.
          Unification is a hash, not a merger. The CID above is the only structure required for the seven to be one.
        </p>
        <div className="mt-4 border-t border-border pt-3 text-[0.6rem] uppercase tracking-[0.22em] text-muted-foreground">
          RATIFIED BY TYCHOMORR · KETHER_GATE · 7D UNIFICATION SURFACE · v1.0.0
        </div>
      </section>
    </div>
  );
}

function Label({ a, b }: { a: string; b: string }) {
  return (
    <div className="flex items-baseline gap-2 text-[0.62rem] uppercase tracking-[0.22em]">
      <span className="text-primary">{a}</span><span className="text-border">//</span><span className="text-foreground">{b}</span>
    </div>
  );
}
function Cell({ k, v }: { k: string; v: string }) {
  return (
    <div className="bg-background/60 px-4 py-2">
      <span className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">{k}</span>
      <span className="ml-2 font-mono text-foreground">{v}</span>
    </div>
  );
}
function AxisRow({ glyph, name, desc, v, activity, href }: {
  glyph: string; name: string; desc: string; v: string; activity: number; href: string;
}) {
  return (
    <Link to={href} className="block bg-background/40 p-4 hover:bg-background/70">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-xl text-primary">{glyph}</span>
          <div>
            <div className="font-display text-sm text-foreground">{name}</div>
            <div className="text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground">{desc}</div>
          </div>
        </div>
        <div className="text-right text-xs text-foreground/85">{v}</div>
      </div>
      <div className="mt-2 h-1 w-full bg-border">
        <div className="h-full bg-primary" style={{ width: `${Math.round(activity * 100)}%` }} />
      </div>
    </Link>
  );
}
