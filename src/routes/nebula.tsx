import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BLADES } from "@/data/blades";
import { loadChain, type TruthChainLink } from "@/data/truth-chain";
import { probeSignedStatus } from "@/lib/probe-signed";
import type { ProbeStatus } from "@/lib/probes";

const BLADE = BLADES.find((b) => b.n === "04")!;

export const Route = createFileRoute("/nebula")({
  head: () => ({
    meta: [
      { title: `${BLADE.name} · Blade ${BLADE.n}` },
      { name: "description", content: BLADE.tagline },
    ],
  }),
  component: NebulaBlade,
});

type SignedResult = ProbeStatus & { detail?: string };

function NebulaBlade() {
  const [chain, setChain] = useState<TruthChainLink[]>([]);
  const [results, setResults] = useState<Map<string, SignedResult>>(new Map());
  const [probing, setProbing] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setChain(loadChain());
  }, []);

  const measured = useMemo(
    () => Array.from(results.values()).filter((r) => r.state === "measured").length,
    [results],
  );

  async function probeAll() {
    setProbing(true);
    const next = new Map<string, SignedResult>();
    await Promise.all(
      chain.map(async (link) => {
        const r = await probeSignedStatus(link.statusUrl, link.edPubHex);
        next.set(link.id, r);
      }),
    );
    setResults(next);
    setProbing(false);
    setTick((t) => t + 1);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-12">
      <header className="space-y-3 border-b border-border pb-6">
        <div className="flex items-baseline justify-between gap-4">
          <div className="text-[0.7rem] uppercase tracking-[0.22em] text-gold">
            OMNI-SAM AXIS · BLADE {BLADE.n}
          </div>
          <Link to="/" className="text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground hover:text-gold">
            ← axis
          </Link>
        </div>
        <h1 className="font-display text-3xl tracking-[0.1em] text-foreground">
          <span className="text-gold">{BLADE.glyph}</span>&nbsp; {BLADE.name}
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Signed health surface from registered relays. Each link in the Truth
          Chain is probed against its ed25519 pubkey; only a verified signature
          flips to MEASURED. Unsigned 200 = REACHABLE, never HEALTHY.
        </p>
      </header>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded border border-border bg-card/40 p-4">
        <div className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
          relays&nbsp;<span className="text-foreground">{chain.length}</span>
          &nbsp;·&nbsp;measured&nbsp;<span className="text-gold">{measured}</span>
          &nbsp;·&nbsp;sweep&nbsp;<span className="text-foreground">{tick}</span>
        </div>
        <button
          onClick={probeAll}
          disabled={chain.length === 0 || probing}
          className="rounded border border-gold px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.2em] text-gold transition hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {probing ? "probing…" : "sweep signed health"}
        </button>
      </section>

      {chain.length === 0 ? (
        <section className="rounded border border-border bg-card/40 p-6">
          <div className="text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground">
            no registered relays
          </div>
          <p className="mt-2 text-sm text-foreground">
            The Truth Chain holds zero links on this device. Enroll one from
            the Gateway to populate this surface.
          </p>
          <Link to="/gateway" className="mt-3 inline-block font-mono text-[0.7rem] text-gold hover:underline">
            → /gateway
          </Link>
        </section>
      ) : (
        <section className="space-y-2">
          {chain.map((link) => {
            const r = results.get(link.id);
            return <RelayRow key={link.id} link={link} result={r} />;
          })}
        </section>
      )}
    </div>
  );
}

function RelayRow({ link, result }: { link: TruthChainLink; result?: SignedResult }) {
  const state = result?.state ?? "idle";
  const cls =
    state === "measured" ? "border-gold/70 text-gold"
    : state === "reachable" ? "border-border text-foreground"
    : state === "unreachable" ? "border-destructive/60 text-destructive"
    : "border-border text-muted-foreground";
  return (
    <div className={`rounded border bg-card/40 p-4 ${cls}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="font-mono text-[0.78rem] uppercase tracking-[0.16em] text-foreground">
          {link.label} <span className="text-muted-foreground">· {link.region}</span>
        </div>
        <div className="font-mono text-[0.65rem] uppercase tracking-[0.2em]">{state}</div>
      </div>
      <div className="mt-2 grid gap-1 font-mono text-[0.65rem] text-muted-foreground sm:grid-cols-2">
        <span>status_url: <span className="text-foreground">{link.statusUrl}</span></span>
        <span>ed_pub: <span className="text-foreground">{link.edPubHex.slice(0, 24)}…</span></span>
        <span>endpoint: <span className="text-foreground">{link.endpoint}</span></span>
        <span>enrolled: <span className="text-foreground">{new Date(link.enrolledAt).toISOString().slice(0, 19)}Z</span></span>
      </div>
      {result && "detail" in result && result.detail && (
        <div className="mt-2 font-mono text-[0.68rem]">→ {result.detail}</div>
      )}
    </div>
  );
}
