// Telemetry sovereignty toggle. Three modes, default OFF.
// Rendered in the audit surface — never elsewhere — so the choice stays
// explicit, never buried in a settings sub-menu.

import { useEffect, useState } from "react";
import {
  getTelemetryMode,
  setTelemetryMode,
  readLocalLog,
  clearLocalLog,
  type TelemetryMode,
} from "@/lib/telemetry";

const MODES: { value: TelemetryMode; label: string; gloss: string }[] = [
  { value: "off", label: "OFF", gloss: "Default. Nothing recorded, nothing sent." },
  { value: "local", label: "LOCAL", gloss: "Opt-in. Page views appended to IndexedDB. No egress." },
  { value: "posthog", label: "POSTHOG", gloss: "Opt-in. Legacy us.posthog.com ingest. Centralized." },
];

export function TelemetryToggle() {
  const [mode, setMode] = useState<TelemetryMode>("off");
  const [count, setCount] = useState(0);

  useEffect(() => {
    setMode(getTelemetryMode());
    void readLocalLog().then((l) => setCount(l.length));
  }, []);

  function pick(next: TelemetryMode) {
    setTelemetryMode(next);
    setMode(next);
    if (next === "posthog" && typeof window !== "undefined") {
      // Re-init requires a reload because PostHog only initializes once.
      window.location.reload();
    }
  }

  async function clear() {
    await clearLocalLog();
    setCount(0);
  }

  return (
    <section className="space-y-3 border border-border bg-card/30 p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-[0.7rem] uppercase tracking-[0.22em] text-gold">
          Telemetry · sovereign switch
        </div>
        <div className="font-mono text-[0.65rem] text-muted-foreground">
          local log: {count} event{count === 1 ? "" : "s"}
        </div>
      </header>
      <p className="text-xs text-muted-foreground">
        Default OFF. Mode persists in <code className="px-1 font-mono">cmap.telemetry.mode.v1</code>.
        POSTHOG mode is the only one that touches the network.
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        {MODES.map((m) => {
          const active = mode === m.value;
          return (
            <button
              key={m.value}
              onClick={() => pick(m.value)}
              className={`text-left border px-3 py-2 transition ${
                active
                  ? m.value === "posthog"
                    ? "border-destructive bg-destructive/10 text-destructive"
                    : "border-gold bg-gold/10 text-gold"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="font-mono text-[0.7rem] uppercase tracking-[0.18em]">{m.label}</div>
              <div className="mt-1 text-[0.7rem] leading-snug">{m.gloss}</div>
            </button>
          );
        })}
      </div>
      <div className="flex justify-end">
        <button
          onClick={clear}
          className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground hover:text-destructive"
        >
          clear local log
        </button>
      </div>
    </section>
  );
}
