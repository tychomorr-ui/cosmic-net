export function DoctrineHero() {
  return (
    <section className="border border-border bg-card/40 p-8">
      <div className="text-[0.7rem] uppercase tracking-[0.18em] text-gold">Truth Coin · TRC · Doctrine</div>
      <h1 className="mt-3 font-display text-3xl leading-tight text-foreground sm:text-4xl">
        The highest investment is the rise of the bottom 2%.
      </h1>
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        Truth Coin is the intended redistribution arc of the sovereign field — value flowing directly to those who
        better themselves and the planet. This page describes the doctrine. The chain is not yet issued; no balances
        or transfers are real until launch and independent audit.
      </p>
      <div className="mt-6 border border-[color:var(--doctrine)] bg-background/60 p-5">
        <div className="text-[0.7rem] uppercase tracking-[0.18em] text-[color:var(--doctrine)]">
          Pre-issuance · Doctrine only
        </div>
        <p className="mt-2 text-sm text-foreground/85">
          No coins have been minted. No treasury exists. No transfers have occurred. All numeric fields below
          display — until the chain is launched and externally audited.
        </p>
      </div>
    </section>
  );
}
