import { useEffect, useState } from "react";
import type { InvalidReason } from "@/lib/invalid-proof-metrics";

// Why a malformed `#proof=` link was rejected — operator-facing copy.
const EXPLAIN: Record<InvalidReason, { title: string; body: string }> = {
  empty: {
    title: "Empty hash value",
    body: "The link contained `#proof=` with no value. Paste the full 64-character SHA-256 after the equals sign.",
  },
  too_short: {
    title: "Hash too short",
    body: "Proof hashes are exactly 64 hex characters. The value in this link was shorter — likely a copy that stopped early.",
  },
  too_long: {
    title: "Hash too long",
    body: "Proof hashes are exactly 64 hex characters. The value in this link was longer — extra text or a second token was appended.",
  },
  non_hex: {
    title: "Non-hex characters",
    body: "The value was 64 characters but contained characters outside `0–9` and `a–f`. SHA-256 hashes are lowercase hex only.",
  },
};

interface InvalidEventDetail {
  reason: InvalidReason;
  len: number;
  preview: string;
  ts: number;
}

interface LastInvalid extends InvalidEventDetail {
  // Local UI state only — derived from the live event, never persisted here.
}

export function InvalidProofFallback() {
  const [last, setLast] = useState<LastInvalid | null>(null);

  useEffect(() => {
    const onInvalid = (e: Event) => {
      const detail = (e as CustomEvent<InvalidEventDetail>).detail;
      if (!detail) return;
      setLast(detail);
    };
    window.addEventListener("nexinus:invalid-proof", onInvalid);
    return () => window.removeEventListener("nexinus:invalid-proof", onInvalid);
  }, []);

  if (!last) return null;

  const explain = EXPLAIN[last.reason];
  const ts = (() => {
    try {
      return new Date(last.ts).toISOString().replace("T", " ").slice(0, 19) + "Z";
    } catch {
      return "";
    }
  })();

  return (
    <section
      role="status"
      aria-live="polite"
      className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm"
    >
      <header className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-destructive">Deep-link rejected: {explain.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            The Proof Detail modal did not open because the URL fragment is not a valid SHA-256
            anchor. The bad fragment has already been removed from the address bar — copy a correct
            link or dismiss this panel.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setLast(null)}
          aria-label="Dismiss invalid proof notice"
          className="rounded border border-border bg-background px-2 py-1 text-xs hover:bg-muted"
        >
          Dismiss
        </button>
      </header>

      <p className="mb-3 text-xs">{explain.body}</p>

      <dl className="grid grid-cols-3 gap-3 rounded border border-border bg-background/60 p-3 font-mono text-xs">
        <div>
          <dt className="text-[10px] uppercase text-muted-foreground">Reason</dt>
          <dd>{last.reason}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase text-muted-foreground">Length</dt>
          <dd>{last.len} / 64</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase text-muted-foreground">When</dt>
          <dd>{ts}</dd>
        </div>
        <div className="col-span-3">
          <dt className="text-[10px] uppercase text-muted-foreground">Preview (truncated)</dt>
          <dd className="break-all">{last.preview || <span className="italic">empty</span>}</dd>
        </div>
      </dl>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => {
            // Belt-and-braces: even though ProofDeepLink already strips the
            // hash, an operator clicking "Clear hash" should never leave any
            // fragment behind, including unrelated ones.
            if (typeof window !== "undefined") {
              history.replaceState(null, "", window.location.pathname + window.location.search);
            }
            setLast(null);
          }}
          className="rounded bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:opacity-90"
        >
          Clear hash
        </button>
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setLast(null);
          }}
          className="rounded border border-border px-3 py-1.5 text-xs hover:bg-muted"
        >
          Got it
        </a>
      </div>
    </section>
  );
}

export default InvalidProofFallback;
