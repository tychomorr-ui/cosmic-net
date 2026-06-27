export function MetricTile({ label, subtitle }: { label: string; subtitle: string }) {
  return (
    <div className="border border-border bg-card/40 p-5">
      <div className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-3 font-display text-3xl text-foreground tabular-nums">—</div>
      <div className="mt-2 text-[0.72rem] uppercase tracking-[0.15em] text-muted-foreground">
        {subtitle}
      </div>
    </div>
  );
}
