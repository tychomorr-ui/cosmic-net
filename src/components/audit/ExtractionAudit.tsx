// Pass 5a surface — live Extraction-Vector Audit dashboard.

import {
  EXTRACTION_AUDIT,
  overallScore,
  tallyTenet,
  type TenetVerdict,
} from "@/lib/extraction-audit";

const TONE: Record<TenetVerdict, string> = {
  pass: "border-[color:var(--measured)] text-[color:var(--measured)]",
  warn: "border-gold text-gold",
  fail: "border-destructive text-destructive",
};

const TENETS = [
  { key: "portability" as const, label: "Portability", gloss: "Data extractable?" },
  { key: "rentSeeking" as const, label: "Rent-seeking", gloss: "Middleman in path?" },
  { key: "truthUtility" as const, label: "Truth-utility", gloss: "Locally verifiable?" },
];

export function ExtractionAudit() {
  const score = overallScore();
  return (
    <section className="space-y-3 border border-border bg-card/30 p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-[0.7rem] uppercase tracking-[0.22em] text-gold">
          Extraction-Vector Audit · Pass 5a
        </div>
        <div className="font-mono text-[0.65rem] text-muted-foreground">
          pass {score.pass} · warn {score.warn} · fail {score.fail} / {score.total}
        </div>
      </header>
      <p className="text-xs text-muted-foreground">
        Each dependency projected onto the three Sovereign Reclaim tenets. Derived from{" "}
        <code className="px-1 font-mono">src/lib/extraction-audit.ts</code> — no network calls.
      </p>

      <div className="grid gap-2 sm:grid-cols-3">
        {TENETS.map((t) => {
          const tally = tallyTenet(t.key);
          return (
            <div key={t.key} className="border border-border bg-background/40 p-2">
              <div className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
                {t.label}
              </div>
              <div className="mt-0.5 text-[0.65rem] text-muted-foreground/80">{t.gloss}</div>
              <div className="mt-1 flex gap-2 font-mono text-[0.7rem]">
                <span className="text-[color:var(--measured)]">{tally.pass}</span>
                <span className="text-gold">{tally.warn}</span>
                <span className="text-destructive">{tally.fail}</span>
              </div>
            </div>
          );
        })}
      </div>

      <ul className="divide-y divide-border">
        {EXTRACTION_AUDIT.map((r) => (
          <li key={r.id} className="grid gap-2 py-2 sm:grid-cols-[1fr_auto]">
            <div className="space-y-1">
              <div className="font-mono text-[0.72rem] text-foreground">{r.host}</div>
              <div className="text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">
                {r.category} · {r.removable}
              </div>
              <dl className="mt-1 grid gap-0.5 text-[0.65rem] text-muted-foreground sm:grid-cols-3">
                <div title={r.rationale.portability}>
                  <span className="text-foreground/70">portability:</span> {r.rationale.portability}
                </div>
                <div title={r.rationale.rentSeeking}>
                  <span className="text-foreground/70">rent:</span> {r.rationale.rentSeeking}
                </div>
                <div title={r.rationale.truthUtility}>
                  <span className="text-foreground/70">truth:</span> {r.rationale.truthUtility}
                </div>
              </dl>
            </div>
            <div className="flex h-fit shrink-0 flex-wrap gap-1">
              {TENETS.map((t) => (
                <span
                  key={t.key}
                  className={`border px-1.5 py-0.5 text-[0.55rem] uppercase tracking-[0.16em] ${TONE[r[t.key]]}`}
                  title={`${t.label}: ${r[t.key]}`}
                >
                  {t.label[0]}·{r[t.key]}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
