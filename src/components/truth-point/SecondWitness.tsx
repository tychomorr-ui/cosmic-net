export function SecondWitness() {
  const url = import.meta.env.VITE_TELEMETRY_STATUS_JSON_URL as string | undefined;
  return (
    <section className="border border-border bg-card/30 p-6">
      <div className="text-[0.7rem] uppercase tracking-[0.18em] text-gold">Second witness · external telemetry</div>
      <h3 className="mt-2 font-display text-lg text-foreground">
        {url ? "Configured · awaiting fetch" : "Standby"}
      </h3>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
        A second witness is an independent JSON manifest hosted off-app that mirrors fleet health from another vantage.
        Until one is configured, only the in-card browser probes count as direct evidence. Set
        <code className="mx-1 font-mono text-foreground">VITE_TELEMETRY_STATUS_JSON_URL</code>
        at build time to enable cross-checking.
      </p>
      {url && (
        <div className="mt-3 font-mono text-[0.7rem] text-foreground/70">{url}</div>
      )}
    </section>
  );
}
