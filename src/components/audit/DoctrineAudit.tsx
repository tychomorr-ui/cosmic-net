// Pass 1 surface — Doctrine Audit panel.
// Renders DOCTRINE_AUDIT verbatim. No silent renames.

import { DOCTRINE_AUDIT, auditTally, type AuditStatus } from "@/lib/doctrine-audit";

const TONE: Record<AuditStatus, string> = {
  provable: "border-[color:var(--measured)] text-[color:var(--measured)]",
  declared: "border-gold text-gold",
  aspirational: "border-destructive/70 text-destructive",
};

export function DoctrineAudit() {
  const t = auditTally();
  return (
    <section className="space-y-3 border border-border bg-card/30 p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-[0.7rem] uppercase tracking-[0.22em] text-gold">
          Doctrine Audit · UI ↔ Evidence
        </div>
        <div className="font-mono text-[0.65rem] text-muted-foreground">
          provable {t.provable} · declared {t.declared} · aspirational {t.aspirational}
        </div>
      </header>
      <p className="text-xs text-muted-foreground">
        Every user-visible claim cross-referenced against what the code can
        actually prove in-browser. Rows are read straight from
        <code className="px-1 font-mono">src/lib/doctrine-audit.ts</code>.
      </p>
      <ul className="divide-y divide-border">
        {DOCTRINE_AUDIT.map((r) => (
          <li key={r.surface + r.claim} className="grid gap-1 py-2 sm:grid-cols-[1fr_2fr_auto]">
            <div className="font-mono text-[0.72rem] text-foreground">{r.surface}</div>
            <div className="space-y-0.5">
              <div className="text-[0.78rem] text-foreground/90">{r.claim}</div>
              <div className="text-[0.7rem] text-muted-foreground">{r.evidence}</div>
            </div>
            <span
              className={`h-fit shrink-0 border px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.18em] ${TONE[r.status]}`}
            >
              {r.status}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
