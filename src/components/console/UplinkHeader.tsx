import { useEffect, useState } from "react";
import { useProbeStatus } from "@/lib/probe-store";

type Row = {
  key: string;
  label: string;
  host: string;
  meta: string;
  probeId?: string; // matches src/data/nodes.ts ids
};

const ROWS: Row[] = [
  { key: "tesseract-a", label: "TESSERACT-A", host: "nexinus.net · 5.223.65.20",
    meta: "SSL valid · sovereign auth", probeId: "xinus-monarch" },
  { key: "valkyrie", label: "VALKYRIE", host: "valkyrie.nexinus.net · 5.78.148.244",
    meta: "SSL valid · dark mirror", probeId: "xinus-valkyrie" },
  { key: "kether", label: "KETHER-GATE", host: "kether.nexinus.net",
    meta: "SSL pending · node hub/mesh" },
];

export function UplinkHeader() {
  const utc = useUtcClock();
  const [mode, setMode] = useState<"day" | "night">("night");

  return (
    <section className="border-b border-border bg-card/30">
      <div className="mx-auto max-w-6xl px-6 py-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div className="text-[0.7rem] uppercase tracking-[0.22em] text-gold">
            tesseract terminus
          </div>
          <div className="flex items-center gap-3 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground">
            <button
              onClick={() => setMode("day")}
              className={mode === "day" ? "text-gold" : "hover:text-foreground"}
              aria-pressed={mode === "day"}
            >
              ☼ DAY
            </button>
            <span className="text-border">·</span>
            <button
              onClick={() => setMode("night")}
              className={mode === "night" ? "text-gold" : "hover:text-foreground"}
              aria-pressed={mode === "night"}
            >
              ☽ NIGHT
            </button>
            <span className="text-border">·</span>
            <span>OPERATOR</span>
            <span className="text-foreground">@tychomorr</span>
            <span className="text-gold">◆</span>
            <span className="tabular-nums text-foreground">{utc} UTC</span>
          </div>
        </div>

        <ul className="mt-4 grid gap-2 sm:grid-cols-3">
          {ROWS.map((r) => (
            <UplinkRow key={r.key} row={r} />
          ))}
        </ul>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
          <span>Tyler Morris · Nexinus RI Systems LLC</span>
          <span className="text-gold">#XINUS</span>
          <span>·</span>
          <span className="text-gold">#RealChange</span>
          <span className="text-border">·</span>
          <span>KETHER_GATE · v1.3.0</span>
          <span className="text-border">·</span>
          <span>SOV-ROOT</span>
        </div>
      </div>
    </section>
  );
}

function UplinkRow({ row }: { row: Row }) {
  const probe = useProbeStatus(row.probeId ?? "__none__");
  const dot =
    !row.probeId
      ? "bg-muted-foreground/40"
      : probe.state === "ok"
      ? "bg-[color:var(--measured)]"
      : probe.state === "fail"
      ? "bg-destructive"
      : probe.state === "probing"
      ? "bg-gold animate-pulse"
      : "bg-muted-foreground/40";
  return (
    <li className="rounded border border-border bg-background/40 px-3 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.22em] text-foreground">
          <span className={`inline-block h-2 w-2 rounded-full ${dot}`} aria-hidden />
          <span className="text-gold">▸</span> {row.label}
        </div>
      </div>
      <div className="mt-1 font-mono text-[0.65rem] text-muted-foreground">
        {row.host}
      </div>
      <div className="font-mono text-[0.65rem] text-muted-foreground">{row.meta}</div>
    </li>
  );
}

function useUtcClock() {
  const [t, setT] = useState(() => new Date().toISOString().slice(11, 19));
  useEffect(() => {
    const id = setInterval(() => setT(new Date().toISOString().slice(11, 19)), 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}
