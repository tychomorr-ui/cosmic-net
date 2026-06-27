const ITEMS = [
  ["Archangel", "Doctrine · Sensor API Standby"],
  ["Travel Guardian", "Measured route receipts only"],
  ["KetherGate", "Active gateway by probe"],
  ["Valkyrie", "Registered · Health pending"],
  ["Helsinki · Singapore · Falkenstein", "Topology claim · Standby"],
  ["Recursion Depth", "Δ 7 · Local"],
  ["Xinus MonarchOS", "Telemetry-gated"],
  ["Nebulous Mesh", "Health endpoints pending"],
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
