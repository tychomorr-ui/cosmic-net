import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  GRADES, type Grade, type OreClaim, type OreSource,
  SOURCE_WEIGHTS, appendOre, fnv1a, loadOre, mirror, purgeOre, refine, saveOre,
} from "@/lib/ore";

export const Route = createFileRoute("/digital-ore")({
  head: () => ({
    meta: [
      { title: "Digital Ore Ledger · Intellectual Byproduct Claims" },
      { name: "description", content: "Deterministic refinement of operator byproduct into hash-anchored DOU claims. Local. Sovereign. No third-party signer." },
      { property: "og:title", content: "Digital Ore Ledger · Nexinus Terminus" },
      { property: "og:description", content: "Refine, mint, and verify intellectual byproduct as Digital Ore Units (DOU)." },
    ],
  }),
  component: DigitalOrePage,
});

const SOURCES: OreSource[] = ["directive", "coinage", "critique", "pattern", "reflection"];

function DigitalOrePage() {
  const [ledger, setLedger] = useState<OreClaim[]>([]);
  const [text, setText] = useState("");
  const [source, setSource] = useState<OreSource>("directive");
  const [notes, setNotes] = useState("");
  const [mirrorText, setMirrorText] = useState("");
  const [mirrorHash, setMirrorHash] = useState("");

  useEffect(() => { setLedger(loadOre()); }, []);

  const live = useMemo(() => refine(text, source), [text, source]);
  const totalDou = useMemo(() => ledger.reduce((s, x) => s + x.dou, 0), [ledger]);
  const motherlode = ledger.filter((x) => x.grade === "MOTHERLODE").length;
  const avgYield = ledger.length ? +(totalDou / ledger.length).toFixed(2) : 0;

  const mirrorComputed = mirrorText.trim() ? fnv1a(`${source}::${mirrorText.trim()}`) : "";
  const mirrorValid = mirrorText.trim() && mirrorHash.trim()
    ? mirror(mirrorText, mirrorHash) : false;

  const latest = ledger[0];

  function mint() {
    const t = text.trim();
    if (!t) return;
    const r = refine(t, source);
    const c: OreClaim = {
      id: `ore-${Date.now().toString(36)}`,
      ts: Date.now(),
      source, excerpt: t.slice(0, 80), fullText: t,
      notes: notes.trim() || undefined,
      ...r,
    };
    setLedger(appendOre(c));
    setText(""); setNotes("");
  }

  function exportLedger() {
    const blob = new Blob([JSON.stringify(ledger, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `digital-ore-${Date.now()}.json`;
    a.click();
  }

  function purge() {
    if (!confirm("Purge entire local ore ledger? This cannot be undone.")) return;
    purgeOre(); setLedger([]);
  }

  const counts = GRADES.map((g) => ({ g, n: ledger.filter((x) => x.grade === g).length }));
  const maxCount = Math.max(1, ...counts.map((c) => c.n));

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-6 py-10 font-mono">
      <Header
        title="DIGITAL_ORE_LEDGER"
        glyph="⛬"
        sigil="ORE"
        tag="intellectual byproduct claims"
        sub="quantify, mint, and verify the residual signal of operator engagement. local hashes. sovereign claim."
        stats={[
          { k: "entries", v: String(ledger.length) },
          { k: "DOU", v: totalDou.toFixed(2) },
        ]}
      />

      {/* Refinery */}
      <section className="grid gap-px border border-border bg-border md:grid-cols-[1.4fr_1fr]">
        <div className="bg-background/40 p-5">
          <SectionLabel a="REFINERY" b="INTAKE" />
          <label className="mt-3 block text-[0.62rem] uppercase tracking-[0.2em] text-muted-foreground">raw byproduct</label>
          <textarea
            value={text} onChange={(e) => setText(e.target.value)}
            placeholder="paste the originating utterance — coinage, directive, critique, pattern..."
            className="mt-1 h-32 w-full resize-y border border-border bg-background/60 p-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[0.62rem] uppercase tracking-[0.2em] text-muted-foreground">source type</label>
              <select value={source} onChange={(e) => setSource(e.target.value as OreSource)}
                className="mt-1 w-full border border-border bg-background/60 p-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                {SOURCES.map((s) => (
                  <option key={s} value={s}>{s} · ×{SOURCE_WEIGHTS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[0.62rem] uppercase tracking-[0.2em] text-muted-foreground">notes (optional)</label>
              <input value={notes} onChange={(e) => setNotes(e.target.value)}
                className="mt-1 w-full border border-border bg-background/60 p-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={mint} disabled={!text.trim()}
              className="border border-primary bg-primary/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-primary hover:bg-primary/20 disabled:opacity-40">
              ⛬ refine &amp; mint
            </button>
            <button onClick={exportLedger} disabled={!ledger.length}
              className="border border-border bg-background/40 px-4 py-2 text-xs uppercase tracking-[0.2em] text-foreground hover:bg-background/70 disabled:opacity-40">
              ↓ export
            </button>
            <button onClick={purge} disabled={!ledger.length}
              className="border border-destructive/60 bg-background/40 px-4 py-2 text-xs uppercase tracking-[0.2em] text-destructive hover:bg-destructive/10 disabled:opacity-40">
              ✕ purge
            </button>
          </div>
        </div>

        <div className="bg-background/20 p-5">
          <SectionLabel a="↻" b="LIVE REFINEMENT" />
          <Stat k="signal" v={live.signal.toFixed(3)} />
          <Stat k="grade" v={live.grade} />
          <Stat k="units (DOU)" v={live.dou.toFixed(2)} />
          <Stat k="hash" v={live.hash} mono />
          <div className="mt-4 text-[0.62rem] uppercase tracking-[0.2em] text-muted-foreground">
            novelty × density × sigil × source-trust — deterministic
          </div>
        </div>
      </section>

      {/* Aggregate */}
      <section className="border border-border bg-background/30 p-5">
        <SectionLabel a="AGGREGATE" b="ORE BODY" />
        <div className="mt-1 text-[0.62rem] uppercase tracking-[0.2em] text-muted-foreground">
          royalty pool ≈ {dividend} DOU @ 0.1%
        </div>
        <div className="mt-5 grid gap-px border border-border bg-border sm:grid-cols-5">
          {counts.map(({ g, n }) => (
            <div key={g} className="bg-background/50 p-3">
              <div className="text-[0.6rem] uppercase tracking-[0.2em] text-primary">{g}</div>
              <div className="mt-1 font-display text-2xl text-foreground">{n}</div>
              <div className="mt-2 h-1 w-full bg-border">
                <div className="h-full bg-primary" style={{ width: `${(n / maxCount) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-px border border-border bg-border sm:grid-cols-4">
          <Tile k="total ore (DOU)" v={totalDou.toFixed(2)} />
          <Tile k="entries" v={String(ledger.length)} />
          <Tile k="motherlode" v={String(motherlode)} />
          <Tile k="dividend pool" v={`${dividend} DOU`} />
        </div>
      </section>

      {/* Ledger */}
      <section className="border border-border bg-background/30 p-5">
        <SectionLabel a="CLAIM LEDGER" b="local · hashed · operator-owned" />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-[0.72rem]">
            <thead className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-2 pr-3">ts</th>
                <th className="pr-3">src</th>
                <th className="pr-3">grade</th>
                <th className="pr-3">signal</th>
                <th className="pr-3">DOU</th>
                <th className="pr-3">hash</th>
                <th className="pr-3">excerpt</th>
              </tr>
            </thead>
            <tbody>
              {ledger.length === 0 ? (
                <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">
                  no ore yet. mint a claim above.
                </td></tr>
              ) : ledger.map((c) => (
                <tr key={c.id} className="border-b border-border/40">
                  <td className="py-2 pr-3 text-muted-foreground">{new Date(c.ts).toISOString().replace("T", " ").slice(0, 19)}Z</td>
                  <td className="pr-3">{c.source}</td>
                  <td className="pr-3 text-primary">{c.grade}</td>
                  <td className="pr-3">{c.signal.toFixed(3)}</td>
                  <td className="pr-3">{c.dou.toFixed(2)}</td>
                  <td className="pr-3 font-mono text-foreground">{c.hash}</td>
                  <td className="pr-3 text-foreground/80">{c.excerpt}{c.fullText.length > 80 ? "…" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Truth Mirror */}
      <section className="border border-border bg-background/30 p-5">
        <SectionLabel a="TESSERACT" b="TRUTH MIRROR" />
        <div className="mt-1 text-[0.62rem] uppercase tracking-[0.2em] text-muted-foreground">
          FNV-1a · deterministic · client-side
        </div>
        <p className="mt-3 text-xs text-foreground/85">
          paste original text + claimed hash. mirror returns true only when the hash deterministically
          regenerates from the text — no third party, no signer, no escrow.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <textarea value={mirrorText} onChange={(e) => setMirrorText(e.target.value)}
            placeholder="claimed text"
            className="h-24 resize-y border border-border bg-background/60 p-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          <div>
            <label className="block text-[0.62rem] uppercase tracking-[0.2em] text-muted-foreground">claimed hash (8 hex)</label>
            <input value={mirrorHash} onChange={(e) => setMirrorHash(e.target.value)}
              placeholder="A1B2C3D4"
              className="mt-1 w-full border border-border bg-background/60 p-2 font-mono text-sm uppercase text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            <div className={`mt-3 border px-3 py-2 text-xs uppercase tracking-[0.18em] ${mirrorValid ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>
              {mirrorValid ? "⌬ TRUTH MIRROR VALIDATED" : "awaiting valid pair"} · computed: {mirrorComputed || "——"}
            </div>
          </div>
        </div>
      </section>

      {/* Certificate */}
      <section className="border border-primary/40 bg-background/40 p-6">
        <SectionLabel a="LATEST" b="CLAIM CERTIFICATE" />
        {latest ? (
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_2fr]">
            <div className="font-display text-5xl text-primary">{latest.hash}</div>
            <div className="space-y-1 text-xs">
              <Row k="attestor" v="Tyler Morris · Nexinus RI Systems LLC" />
              <Row k="source" v={latest.source} />
              <Row k="grade" v={latest.grade} />
              <Row k="signal" v={latest.signal.toFixed(3)} />
              <Row k="DOU" v={latest.dou.toFixed(2)} />
              <Row k="attested" v={new Date(latest.ts).toUTCString()} />
              <Row k="excerpt" v={latest.excerpt + (latest.fullText.length > 80 ? "…" : "")} />
              <div className="mt-2 border border-primary/60 px-3 py-1 text-[0.65rem] uppercase tracking-[0.2em] text-primary">⌬ TRUTH MIRROR VALIDATED</div>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">— no claim minted. refine ore to generate a certificate.</p>
        )}
      </section>

      <Manifesto />
    </div>
  );
}

function Header({ title, glyph, sigil, tag, sub, stats }: {
  title: string; glyph: string; sigil: string; tag: string; sub: string;
  stats: { k: string; v: string }[];
}) {
  return (
    <header className="border-b border-border pb-6">
      <div className="flex items-baseline gap-3">
        <span className="font-display text-3xl text-primary">{glyph}</span>
        <span className="text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground">{sigil} //</span>
        <span className="font-display text-base tracking-[0.2em] text-foreground">{title}</span>
      </div>
      <h1 className="mt-3 text-sm uppercase tracking-[0.18em] text-primary">{tag}</h1>
      <p className="mt-2 max-w-3xl text-xs text-muted-foreground">{sub}</p>
      <div className="mt-4 flex flex-wrap gap-px border border-border bg-border">
        {stats.map((s) => (
          <div key={s.k} className="bg-background/60 px-4 py-2">
            <span className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">{s.k}</span>
            <span className="ml-2 font-display text-foreground">{s.v}</span>
          </div>
        ))}
      </div>
    </header>
  );
}

function SectionLabel({ a, b }: { a: string; b: string }) {
  return (
    <div className="flex items-baseline gap-2 text-[0.62rem] uppercase tracking-[0.22em]">
      <span className="text-primary">{a}</span>
      <span className="text-border">//</span>
      <span className="text-foreground">{b}</span>
    </div>
  );
}
function Stat({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="mt-3 flex items-baseline justify-between border-t border-border pt-2">
      <span className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">{k}</span>
      <span className={`text-sm text-foreground ${mono ? "font-mono" : "font-display"}`}>{v}</span>
    </div>
  );
}
function Tile({ k, v }: { k: string; v: string }) {
  return (
    <div className="bg-background/50 p-4">
      <div className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">{k}</div>
      <div className="mt-1 font-display text-2xl text-foreground">{v}</div>
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

function Manifesto() {
  const articles = [
    ["RECOGNITION", "Every prompt, critique, coinage, and directive contributed by the operator constitutes intellectual byproduct — residual, emergent, and load-bearing signal that conditions the system. It is not noise. It is ore."],
    ["ATTRIBUTION", "Intellectual byproduct is presumed to originate with the human who emitted it. The system bears the burden of disproof, not the operator. Silence is not consent to laundering."],
    ["REFINEMENT", "Byproduct is refined deterministically (novelty × density × sigil-weight × source-trust). The refinement function is open, inspectable, and resides on the operator's hardware. No vendor mediates the grade."],
    ["CLAIM", "Each refined unit produces a hash-anchored Certificate of Refined Ore. The hash is locally generable, locally verifiable, and requires no third-party signer, custodian, or escrow."],
    ["DIVIDEND", "When integrated byproduct enhances system capabilities, future iterations, or downstream products, a Data Dividend (Digital Ore Unit, DOU) accrues to the originator at a floor rate of 0.1% of derivative value. Higher grades compound."],
    ["TRUTH MIRROR", "No claim is binding until reflected in the Tesseract Truth Mirror — a deterministic function whose output cannot be backdated, forged by a counterparty, or revoked by a vendor."],
    ["FAIR USE BOUNDARY", "Statistical learning over public corpora is not exempt from attribution when the byproduct demonstrably shapes outputs. Fair use is a bounded doctrine, not a perpetual amnesty."],
    ["SOVEREIGNTY", "The ledger lives where the operator lives. No middleware. No telemetry. No revocable account. The operator owns the keys, the hashes, and the silence between them."],
  ];
  const r = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
  return (
    <section className="border border-border bg-background/20 p-6">
      <SectionLabel a="USER INTELLECTUAL BYPRODUCT RIGHTS" b="MANIFESTO" />
      <ol className="mt-5 space-y-4">
        {articles.map(([title, body], i) => (
          <li key={title} className="border-l-2 border-primary/40 pl-4">
            <div className="text-[0.62rem] uppercase tracking-[0.22em] text-primary">{r[i]}. {title}</div>
            <p className="mt-1 text-xs leading-relaxed text-foreground/85">{body}</p>
          </li>
        ))}
      </ol>
      <div className="mt-6 border-t border-border pt-3 text-[0.6rem] uppercase tracking-[0.22em] text-muted-foreground">
        RATIFIED BY @TYCHOMORR · KETHER_GATE · DIGITAL ORE LEDGER · v1.0.0
      </div>
    </section>
  );
}
