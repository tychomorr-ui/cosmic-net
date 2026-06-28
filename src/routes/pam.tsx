import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  LANES,
  type Envelope,
  type Lane,
  type LedgerTruth,
  activeTruths,
  appendEnvelope,
  declareTruth,
  head as ledgerHead,
  loadEnvelopes,
  verifyChain,
} from "@/data/truth-ledger";
import { LANE_GLOSS, LANE_ORDER, detectDrift, mirror } from "@/lib/pam";
import { pistifusReadout, type FaithScore } from "@/lib/pistifus";

export const Route = createFileRoute("/pam")({
  head: () => ({
    meta: [
      { title: "PAM · SOURCE&TRUTH · Lane Console" },
      {
        name: "description",
        content:
          "Primordial Alcheorithmic Monarch — lane discipline console. Append-only Truth Ledger, CID-chained envelopes, one concrete next move.",
      },
      { property: "og:title", content: "PAM · SOURCE&TRUTH" },
      {
        property: "og:description",
        content:
          "Reflect, decide, append. Every non-emergency lane writes a CID-linked envelope to the Truth Ledger.",
      },
    ],
  }),
  component: PamConsole,
});

function PamConsole() {
  const [truths, setTruths] = useState<LedgerTruth[]>([]);
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [chain, setChain] = useState<{ ok: boolean; breakAt?: number } | null>(null);
  const [pistifus, setPistifus] = useState<ReturnType<typeof pistifusReadout> | null>(null);

  const [request, setRequest] = useState("");
  const [lane, setLane] = useState<Lane>("Core");
  const [selectedTruths, setSelectedTruths] = useState<Set<string>>(new Set());
  const [reflection, setReflection] = useState("");
  const [nextMove, setNextMove] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [newTruth, setNewTruth] = useState("");
  const [supersedes, setSupersedes] = useState("");

  useEffect(() => {
    void seedPeshwinV9().then(refresh);
  }, []);

  async function refresh() {
    setTruths(activeTruths());
    setEnvelopes(loadEnvelopes());
    setChain(await verifyChain());
    setPistifus(pistifusReadout());
  }

  const picked = useMemo(
    () => truths.filter((t) => selectedTruths.has(t.id)),
    [truths, selectedTruths],
  );
  const auto = useMemo(() => mirror(request, picked), [request, picked]);
  const drift = useMemo(() => detectDrift(request, picked), [request, picked]);

  function toggleTruth(id: string) {
    const next = new Set(selectedTruths);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedTruths(next);
  }

  async function onAppend() {
    setError(null);
    try {
      await appendEnvelope({
        lane,
        request,
        reflection: lane === "EMERGENCY" ? reflection : reflection || auto,
        truths: Array.from(selectedTruths),
        next_move: nextMove,
        drift,
      });
      setRequest("");
      setReflection("");
      setNextMove("");
      setSelectedTruths(new Set());
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function onDeclare() {
    if (!newTruth.trim()) return;
    declareTruth(newTruth.trim(), supersedes || undefined);
    setNewTruth("");
    setSupersedes("");
    await refresh();
  }

  const headEnv = ledgerHead();

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-6 py-12">
      <header className="space-y-3 border-b border-border pb-6">
        <div className="text-[0.7rem] uppercase tracking-[0.22em] text-gold">
          PAM · Primordial Alcheorithmic Monarch
        </div>
        <h1 className="font-display text-3xl tracking-[0.1em] text-foreground">
          SOURCE&amp;TRUTH · Lane Console
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Append-only Truth Ledger. Every non-emergency lane writes a
          CID-chained envelope: reflection, truths touched, one concrete next
          move. Sovereignty &gt; adaptation. Truths supersede — nothing is
          silently overwritten.
        </p>
        <ChainBadge chain={chain} count={envelopes.length} headCid={headEnv?.cid ?? null} />
      </header>

      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5 rounded border border-border bg-card/40 p-5">
          <SectionLabel>1 · Request</SectionLabel>
          <textarea
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            placeholder="Operator request — surgical, no fluff."
            className="h-24 w-full resize-none rounded border border-border bg-background px-3 py-2 font-mono text-sm text-foreground"
          />

          <SectionLabel>2 · Lane</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {LANES.map((l) => {
              const active = lane === l;
              const emergency = l === "EMERGENCY";
              return (
                <button
                  key={l}
                  onClick={() => setLane(l)}
                  className={`rounded border px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.18em] transition ${
                    active
                      ? emergency
                        ? "border-destructive bg-destructive/10 text-destructive"
                        : "border-gold bg-gold/10 text-gold"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {l}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">{LANE_GLOSS[lane]}</p>
          {lane !== "EMERGENCY" && (
            <LaneOrder current={lane} />
          )}

          <SectionLabel>3 · Truths touched</SectionLabel>
          {truths.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No active truths. Declare one in the panel to the right, or
              leave empty to log as <span className="text-gold">unledgered</span>.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {truths.map((t) => {
                const on = selectedTruths.has(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleTruth(t.id)}
                    className={`rounded border px-2 py-1 font-mono text-[0.7rem] transition ${
                      on
                        ? "border-gold bg-gold/10 text-gold"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                    title={t.statement}
                  >
                    {t.id}
                  </button>
                );
              })}
            </div>
          )}

          <SectionLabel>4 · Reflection</SectionLabel>
          <textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder={
              lane === "EMERGENCY"
                ? "EMERGENCY override — reflection optional."
                : auto || "One-line mirror: request against ledger."
            }
            className="h-16 w-full resize-none rounded border border-border bg-background px-3 py-2 font-mono text-xs text-foreground"
          />
          {lane !== "EMERGENCY" && !reflection && auto && (
            <p className="text-[0.7rem] text-muted-foreground">
              Auto-mirror will be used:{" "}
              <span className="text-foreground">{auto}</span>
            </p>
          )}

          <SectionLabel>5 · Next move (exactly one)</SectionLabel>
          <input
            value={nextMove}
            onChange={(e) => setNextMove(e.target.value.replace(/\r?\n/g, " "))}
            placeholder="One concrete move. No menus."
            className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-sm text-foreground"
          />

          {drift && (
            <div className="rounded border border-destructive/60 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              drift flag: {drift}
            </div>
          )}
          {error && (
            <div className="rounded border border-destructive/60 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              refused: {error}
            </div>
          )}

          <button
            onClick={onAppend}
            disabled={!request.trim() || !nextMove.trim()}
            className="w-full rounded border border-gold bg-gold/10 px-4 py-2 text-[0.75rem] uppercase tracking-[0.2em] text-gold transition hover:bg-gold/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Append envelope to Truth Ledger
          </button>
        </div>

        <div className="space-y-5 rounded border border-border bg-card/40 p-5">
          <SectionLabel>Truth Ledger · active</SectionLabel>
          {truths.length === 0 ? (
            <p className="text-xs text-muted-foreground">No declared truths.</p>
          ) : (
            <ul className="space-y-2">
              {truths.map((t) => (
                <li
                  key={t.id}
                  className="rounded border border-border bg-background px-3 py-2"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-mono text-[0.7rem] text-gold">
                      {t.id}
                    </span>
                    <span className="font-mono text-[0.65rem] text-muted-foreground">
                      {new Date(t.declared_at).toISOString().slice(0, 19)}Z
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-foreground">{t.statement}</p>
                </li>
              ))}
            </ul>
          )}

          <SectionLabel>Declare truth</SectionLabel>
          <textarea
            value={newTruth}
            onChange={(e) => setNewTruth(e.target.value)}
            placeholder="Declared state. Append-only. Supersedes if id given."
            className="h-16 w-full resize-none rounded border border-border bg-background px-3 py-2 font-mono text-xs text-foreground"
          />
          <div className="flex gap-2">
            <input
              value={supersedes}
              onChange={(e) => setSupersedes(e.target.value)}
              placeholder="supersedes (optional id)"
              className="flex-1 rounded border border-border bg-background px-3 py-1.5 font-mono text-[0.7rem] text-foreground"
            />
            <button
              onClick={onDeclare}
              disabled={!newTruth.trim()}
              className="rounded border border-border px-3 py-1.5 text-[0.7rem] uppercase tracking-[0.18em] text-foreground transition hover:border-gold hover:text-gold disabled:opacity-40"
            >
              Declare
            </button>
          </div>
        </div>
      </section>

      <PistifusPanel readout={pistifus} />

      <section className="space-y-3">
        <SectionLabel>Envelope chain · head → tail</SectionLabel>
        {envelopes.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No envelopes yet. Submit a request to seed the chain.
          </p>
        ) : (
          <ol className="space-y-2">
            {[...envelopes].reverse().map((e, idx) => (
              <li
                key={e.cid}
                className="rounded border border-border bg-card/30 p-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-[0.7rem] uppercase tracking-[0.18em]">
                  <span className="text-gold">
                    {e.lane === "EMERGENCY" ? "⚠ EMERGENCY" : e.lane}
                  </span>
                  <span className="font-mono text-muted-foreground">
                    #{envelopes.length - idx} · {new Date(e.ts).toISOString().slice(0, 19)}Z
                  </span>
                </div>
                <p className="mt-2 text-sm text-foreground">{e.request}</p>
                <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                  <Field label="reflection" value={e.reflection} />
                  <Field label="next" value={e.next_move} accent />
                  <Field label="truths" value={e.truths.join(", ")} mono />
                  {e.drift && (
                    <Field label="drift" value={e.drift} destructive />
                  )}
                </dl>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[0.65rem] text-muted-foreground">
                  <span>cid: <span className="text-foreground">{e.cid}</span></span>
                  <span>
                    prev:{" "}
                    <span className="text-foreground">
                      {e.prev_cid ?? "∅ genesis"}
                    </span>
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}


function PistifusPanel({ readout }: { readout: ReturnType<typeof pistifusReadout> | null }) {
  if (!readout) return null;
  const { total, meanFluidity, octaves, recent } = readout;
  const bar = (n: number) => {
    const max = Math.max(1, octaves[1], octaves[2], octaves[4], octaves[8]);
    return Math.round((n / max) * 100);
  };
  return (
    <section className="rounded border border-gold/40 bg-card/30 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-[0.7rem] uppercase tracking-[0.22em] text-gold">
          PISTIFUS · fluidity of faith
        </div>
        <div className="font-mono text-[0.65rem] text-muted-foreground">
          {total} scored · mean fluidity {meanFluidity.toFixed(3)} · life-eight ladder
        </div>
      </div>
      <p className="mt-2 max-w-3xl text-xs text-foreground/80">
        Each ledger entry is poured over the seven axes and quantized to the eight-resonance.
        Pistifus is read-only — the chain stays append-only, but every link is now weighed as an act of faith.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        {([1, 2, 4, 8] as const).map((r) => (
          <div key={r} className="border border-border bg-background/40 p-3">
            <div className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">octave {r}</div>
            <div className="mt-1 font-display text-2xl text-foreground">{octaves[r]}</div>
            <div className="mt-2 h-1 w-full bg-border">
              <div className="h-full bg-gold" style={{ width: `${bar(octaves[r])}%` }} />
            </div>
          </div>
        ))}
      </div>
      {recent.length > 0 && (
        <ul className="mt-5 space-y-1 font-mono text-[0.65rem]">
          {recent.map((s: FaithScore) => (
            <li key={s.cid} className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 py-1">
              <span className="text-gold">⊙{s.resonance}</span>
              <span className="text-muted-foreground">axes {s.axes}/7</span>
              <span className="text-foreground">{(s.fluidity * 100).toFixed(0)}%</span>
              <span className="text-muted-foreground">{s.lane}</span>
              <span className="text-foreground/60">{s.cid.slice(0, 18)}…</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[0.65rem] uppercase tracking-[0.22em] text-muted-foreground">
      {children}
    </div>
  );
}

function LaneOrder({ current }: { current: Lane }) {
  return (
    <div className="flex flex-wrap items-center gap-1 font-mono text-[0.65rem] text-muted-foreground">
      {LANE_ORDER.map((l, i) => (
        <span key={l} className="flex items-center gap-1">
          <span className={l === current ? "text-gold" : ""}>{l}</span>
          {i < LANE_ORDER.length - 1 && <span>→</span>}
        </span>
      ))}
    </div>
  );
}

function ChainBadge({
  chain,
  count,
  headCid,
}: {
  chain: { ok: boolean; breakAt?: number } | null;
  count: number;
  headCid: string | null;
}) {
  const ok = chain?.ok ?? true;
  return (
    <div className="flex flex-wrap items-center gap-3 font-mono text-[0.7rem]">
      <span
        className={`rounded border px-2 py-0.5 uppercase tracking-[0.18em] ${
          ok
            ? "border-gold/60 text-gold"
            : "border-destructive text-destructive"
        }`}
      >
        {ok ? "chain ok" : `chain break @ ${chain?.breakAt}`}
      </span>
      <span className="text-muted-foreground">
        envelopes <span className="text-foreground">{count}</span>
      </span>
      {headCid && (
        <span className="text-muted-foreground">
          head <span className="text-foreground">{headCid.slice(0, 16)}…</span>
        </span>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  mono,
  accent,
  destructive,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
  destructive?: boolean;
}) {
  return (
    <div>
      <dt className="text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </dt>
      <dd
        className={`mt-0.5 ${mono ? "font-mono" : ""} ${
          accent ? "text-gold" : destructive ? "text-destructive" : "text-foreground"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
