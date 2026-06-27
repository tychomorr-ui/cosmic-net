import { REALIZATION_PATH } from "@/data/truth-coin";

export function RealizationPath() {
  return (
    <section>
      <div className="text-[0.7rem] uppercase tracking-[0.18em] text-gold">
        Truth Coin realization path · evidence-gated
      </div>
      <h2 className="mt-2 font-display text-2xl text-foreground">
        Timestamped origin can become provenance. Provenance is not issuance.
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        OpenTimestamps, GitHub commits, prior names such as Butts pseudo coin, and Sovereign Universal Digital Gold
        can prove authorship chronology. They do not by themselves create a live coin, audited smart contract,
        treasury, liquidity, compliance posture, or investor rights.
      </p>
      <ol className="mt-6 grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {REALIZATION_PATH.map((s) => (
          <li key={s.n} className="bg-card/40 p-5">
            <div className="font-mono text-xs text-gold">{s.n}</div>
            <div className="mt-1 font-display text-lg text-foreground">{s.title}</div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
