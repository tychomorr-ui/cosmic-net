const ITEMS = [
  ["Root-Gate", "Oregon · 16 GB · control plane"],
  ["Tesseract-Terminus", "Oregon · SSR self-host target"],
  ["XinUS-Clarity", "Ireland · compute-optimized"],
  ["Kether-Gate", "Singapore · APAC gateway"],
  ["Tesseract-A", "Frankfurt · signing surface"],
  ["Resonate-Earth", "Witness · HTTPS reachable"],
  ["Coupling", "LIVE requires ARCHANGEL/v0 signed status"],
  ["Recursion Depth", "Δ 7 · Local"],
] as const;

function Row() {
  return (
    <div className="flex shrink-0 items-center gap-8 px-6">
      {ITEMS.map(([k, v], i) => (
        <span key={i} className="flex items-center gap-3 text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground">
          <span className="text-foreground">{k}</span>
          <span className="text-gold">◆</span>
          <span>{v}</span>
        </span>
      ))}
    </div>
  );
}

export function TickerBar() {
  return (
    <div className="overflow-hidden border-b border-border bg-card/50 py-2">
      <div className="flex w-max animate-[ticker_60s_linear_infinite]">
        <Row />
        <Row />
      </div>
    </div>
  );
}
