import { NODES } from "@/data/nodes";
import { useProbeStatus } from "@/lib/probe-store";

export function TallyStrip() {
  // Subscribe to all probe-capable nodes at top level (hooks rule).
  const monarch = useProbeStatus("xinus-monarch");
  const valkyrie = useProbeStatus("xinus-valkyrie");

  const promoted =
    (monarch.state === "measured" ? 1 : 0) +
    (valkyrie.state === "measured" ? 1 : 0);

  const declaredMeasured = NODES.filter((n) => n.tier === "measured").length;
  const attested = NODES.filter((n) => n.tier === "attested").length;
  const doctrine = NODES.filter((n) => n.tier === "doctrine").length;
  const total = NODES.length;

  return (
    <div className="grid grid-cols-2 gap-px border border-border bg-border md:grid-cols-4">
      <Tile k="Measured" v={`${declaredMeasured + promoted} / ${total}`} hint="declared + probe-promoted" />
      <Tile k="Attested" v={`${attested}`} hint="claimed · unverified" />
      <Tile k="Doctrine" v={`${doctrine}`} hint="intent · not running" />
      <Tile k="Fleet" v={`${total}`} hint="total roster" />
    </div>
  );
}

function Tile({ k, v, hint }: { k: string; v: string; hint: string }) {
  return (
    <div className="bg-card/40 px-5 py-4">
      <div className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">{k}</div>
      <div className="mt-1 font-display text-2xl text-foreground">{v}</div>
      <div className="mt-1 text-[0.65rem] uppercase tracking-[0.18em] text-gold/70">{hint}</div>
    </div>
  );
}
