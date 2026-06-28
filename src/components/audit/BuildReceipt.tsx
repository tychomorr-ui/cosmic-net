// Pass 5c surface — CID Receipt visibility.
//
// Reads /build-receipt.json, written by scripts/pin-ipfs.mjs after a
// sovereign IPFS pin. If absent, the panel says so honestly rather than
// pretending the build is pinned.

import { useEffect, useState } from "react";

type Receipt = {
  cid: string;
  dir: string;
  bytes?: number;
  generated_at: string;
  tool: string;
};

type State =
  | { kind: "loading" }
  | { kind: "missing" }
  | { kind: "error"; detail: string }
  | { kind: "ok"; receipt: Receipt };

export function BuildReceipt() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/build-receipt.json", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setState({ kind: "missing" });
          return;
        }
        const ctype = res.headers.get("content-type") ?? "";
        if (!ctype.includes("json")) {
          if (!cancelled) setState({ kind: "missing" });
          return;
        }
        const j = (await res.json()) as Receipt;
        if (!cancelled) setState({ kind: "ok", receipt: j });
      } catch (e) {
        if (!cancelled) setState({ kind: "error", detail: String(e) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="space-y-3 border border-border bg-card/30 p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-[0.7rem] uppercase tracking-[0.22em] text-gold">
          Build Receipt · Pass 5c
        </div>
        <div className="font-mono text-[0.65rem] text-muted-foreground">
          source: /build-receipt.json
        </div>
      </header>
      <p className="text-xs text-muted-foreground">
        CIDv1 of the last sovereign build, written locally by{" "}
        <code className="px-1 font-mono">scripts/pin-ipfs.mjs</code>. Absence means the
        currently-served bundle was not pinned to your IPFS node — the UI will not pretend
        otherwise.
      </p>

      {state.kind === "loading" && (
        <div className="font-mono text-[0.7rem] text-muted-foreground">probing…</div>
      )}

      {state.kind === "missing" && (
        <div className="border border-border bg-background/40 p-3 font-mono text-[0.7rem] text-muted-foreground">
          NO RECEIPT · run <code className="text-foreground">bun run build &amp;&amp; node scripts/pin-ipfs.mjs</code> against
          your local Kubo node to generate one.
        </div>
      )}

      {state.kind === "error" && (
        <div className="border border-destructive/60 bg-background/40 p-3 font-mono text-[0.7rem] text-destructive">
          RECEIPT_READ_FAILED · {state.detail}
        </div>
      )}

      {state.kind === "ok" && (
        <div className="space-y-2 border border-[color:var(--measured)]/40 bg-background/40 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <code className="break-all font-mono text-[0.75rem] text-[color:var(--measured)]">
              {state.receipt.cid}
            </code>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(state.receipt.cid);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1200);
                } catch {
                  /* clipboard unavailable */
                }
              }}
              className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground hover:text-gold"
            >
              {copied ? "copied" : "copy cid"}
            </button>
          </div>
          <dl className="grid gap-1 font-mono text-[0.65rem] text-muted-foreground sm:grid-cols-3">
            <div>
              <span className="text-foreground/70">dir:</span> {state.receipt.dir}
            </div>
            <div>
              <span className="text-foreground/70">bytes:</span>{" "}
              {state.receipt.bytes ?? "—"}
            </div>
            <div>
              <span className="text-foreground/70">at:</span> {state.receipt.generated_at}
            </div>
          </dl>
          <div className="font-mono text-[0.65rem] text-muted-foreground">
            verify: <span className="text-foreground/80">ipfs cat /ipfs/{state.receipt.cid}</span>
          </div>
        </div>
      )}
    </section>
  );
}
