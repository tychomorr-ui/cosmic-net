import { useEffect, useState } from "react";
import {
  readInvalidProofMetrics,
  clearInvalidProofMetrics,
  type InvalidProofMetrics,
} from "@/lib/invalid-proof-metrics";

const REASON_LABEL: Record<string, string> = {
  empty: "empty",
  too_short: "too short",
  too_long: "too long",
  non_hex: "non-hex",
};

function fmtTs(ts: number | null): string {
  if (!ts) return "—";
  try {
    return new Date(ts).toISOString().replace("T", " ").slice(0, 19) + "Z";
  } catch {
    return "—";
  }
}

export function InvalidProofMetricsPanel() {
  const [m, setM] = useState<InvalidProofMetrics>(() => readInvalidProofMetrics());

  useEffect(() => {
    const refresh = () => setM(readInvalidProofMetrics());
    window.addEventListener("nexinus:invalid-proof", refresh);
    window.addEventListener("storage", refresh);
    const id = window.setInterval(refresh, 5000);
    return () => {
      window.removeEventListener("nexinus:invalid-proof", refresh);
      window.removeEventListener("storage", refresh);
      window.clearInterval(id);
    };
  }, []);

  return (
    <section className="rounded-lg border border-border bg-card p-4 text-sm">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Invalid deep-link attempts</h3>
          <p className="text-xs text-muted-foreground">
            Local-only counter for malformed <code>#proof=</code> hashes. No raw values
            stored, no network. Lives in <code>localStorage</code>.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            clearInvalidProofMetrics();
            setM(readInvalidProofMetrics());
          }}
          className="rounded border border-border px-2 py-1 text-xs hover:bg-muted"
        >
          Reset
        </button>
      </header>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <dt className="text-xs uppercase text-muted-foreground">Total</dt>
          <dd className="text-2xl font-bold tabular-nums">{m.total}</dd>
        </div>
        {(Object.keys(m.by_reason) as Array<keyof typeof m.by_reason>).map((k) => (
          <div key={k}>
            <dt className="text-xs uppercase text-muted-foreground">{REASON_LABEL[k] ?? k}</dt>
            <dd className="text-xl font-semibold tabular-nums">{m.by_reason[k]}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
        <div>First: <span className="font-mono">{fmtTs(m.first_ts)}</span></div>
        <div>Last: <span className="font-mono">{fmtTs(m.last_ts)}</span></div>
      </div>

      {m.recent.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-muted-foreground">
            Recent samples ({m.recent.length})
          </summary>
          <ul className="mt-2 max-h-40 overflow-auto font-mono text-xs">
            {m.recent.map((s, i) => (
              <li key={i} className="flex justify-between border-b border-border/40 py-0.5">
                <span>{fmtTs(s.ts)}</span>
                <span>len={s.len}</span>
                <span>{REASON_LABEL[s.reason] ?? s.reason}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

export default InvalidProofMetricsPanel;
