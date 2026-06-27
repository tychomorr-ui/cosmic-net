import { DIGNITY, computeDignity } from "@/data/truth-coin";

export function DignityModel() {
  const d = computeDignity();
  return (
    <section className="border border-border bg-card/40 p-6">
      <div className="text-[0.7rem] uppercase tracking-[0.18em] text-gold">Sovereign Dignity Due · model receipt</div>
      <h2 className="mt-2 font-display text-2xl text-foreground">
        Five years of survival displacement cannot be priced by market logic.
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        For a retired nurse living from a 4x4 with her dog, repeatedly moved along for trying to exist, the model
        treats Truth Coin as a dignity-credit ledger: moral restitution, not legal tender, wage claim, investment
        advice, or guaranteed blockchain value.
      </p>

      <dl className="mt-6 grid gap-px border border-border bg-border sm:grid-cols-3">
        <Row k="Survival years"   v={`${DIGNITY.survivalYears}`} />
        <Row k="Base dignity"     v={`${DIGNITY.basePerDay} TRC / day`} />
        <Row k="Service honor"    v="Retired nurse" />
        <Row k="Days"             v={d.days.toLocaleString()} />
        <Row k="Baseline credit"  v={`${d.baseline.toLocaleString()} TRC`} />
        <Row k="Model due"        v={`${d.total.toLocaleString()} TRC`} highlight />
      </dl>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Formula: <span className="font-mono text-foreground">{d.days.toLocaleString()} days × {DIGNITY.basePerDay} TRC/day = {d.baseline.toLocaleString()} TRC</span> baseline,
        plus <span className="font-mono text-foreground">{DIGNITY.serviceHonor.toLocaleString()} TRC</span> service-and-continuity honor for years spent caring for others before displacement.
        If a future audited market ever valued <span className="font-mono text-foreground">1 TRC = ${DIGNITY.scenarioPrice.toLocaleString()}</span>,
        then <span className="font-mono text-foreground">{d.total.toLocaleString()} TRC</span> would equal{" "}
        <span className="font-mono text-gold">${d.scenarioUsd.toLocaleString()}</span>. That is a scenario calculation,
        not a promise, debt, security, legal tender, or current balance.
      </p>
    </section>
  );
}

function Row({ k, v, highlight }: { k: string; v: string; highlight?: boolean }) {
  return (
    <div className={`bg-card/60 px-4 py-3 ${highlight ? "border-l-2 border-gold" : ""}`}>
      <dt className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">{k}</dt>
      <dd className={`mt-1 font-mono text-sm ${highlight ? "text-gold" : "text-foreground"}`}>{v}</dd>
    </div>
  );
}
