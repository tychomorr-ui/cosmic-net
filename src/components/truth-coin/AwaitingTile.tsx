export function AwaitingTile({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="border border-border bg-card/40 p-5">
      <div className="text-[0.65rem] uppercase tracking-[0.2em] text-gold">Awaiting launch</div>
      <div className="mt-2 font-display text-3xl text-muted-foreground">—</div>
      <div className="mt-1 text-xs uppercase tracking-[0.14em] text-foreground/80">{label}</div>
      <div className="mt-1 text-[0.65rem] text-muted-foreground">{sub}</div>
    </div>
  );
}
