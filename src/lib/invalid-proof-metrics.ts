// Local-only counter for invalid `#proof=` deep-link attempts.
//
// Doctrine: no telemetry, no network, no PII. We never persist the raw
// hash value — only the length, a coarse reason bucket, and a timestamp.
// The data lives in localStorage so an operator can read it from /ops or
// the browser devtools; nothing leaves the device.

const KEY = "nexinus.invalid_proof_metrics.v1";
const MAX_SAMPLES = 50;

export type InvalidReason = "empty" | "too_short" | "too_long" | "non_hex";

export interface InvalidSample {
  ts: number;
  len: number;
  reason: InvalidReason;
}

export interface InvalidProofMetrics {
  total: number;
  by_reason: Record<InvalidReason, number>;
  first_ts: number | null;
  last_ts: number | null;
  recent: InvalidSample[]; // newest first, capped at MAX_SAMPLES
}

const EMPTY: InvalidProofMetrics = {
  total: 0,
  by_reason: { empty: 0, too_short: 0, too_long: 0, non_hex: 0 },
  first_ts: null,
  last_ts: null,
  recent: [],
};

export function classifyInvalid(raw: string): InvalidReason {
  if (raw.length === 0) return "empty";
  if (raw.length < 64) return "too_short";
  if (raw.length > 64) return "too_long";
  return "non_hex"; // 64 chars but didn't match [a-f0-9]
}

export function readInvalidProofMetrics(): InvalidProofMetrics {
  if (typeof localStorage === "undefined") return { ...EMPTY };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<InvalidProofMetrics>;
    return {
      total: parsed.total ?? 0,
      by_reason: { ...EMPTY.by_reason, ...(parsed.by_reason ?? {}) },
      first_ts: parsed.first_ts ?? null,
      last_ts: parsed.last_ts ?? null,
      recent: Array.isArray(parsed.recent) ? parsed.recent.slice(0, MAX_SAMPLES) : [],
    };
  } catch {
    return { ...EMPTY };
  }
}

/** Record one invalid `#proof=` attempt. Returns the new totals. */
export function recordInvalidProof(raw: string, now: number = Date.now()): InvalidProofMetrics {
  const reason = classifyInvalid(raw);
  const m = readInvalidProofMetrics();
  m.total += 1;
  m.by_reason[reason] = (m.by_reason[reason] ?? 0) + 1;
  m.first_ts ??= now;
  m.last_ts = now;
  m.recent.unshift({ ts: now, len: raw.length, reason });
  if (m.recent.length > MAX_SAMPLES) m.recent.length = MAX_SAMPLES;
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(KEY, JSON.stringify(m));
    } catch {
      // Quota or disabled storage — swallow; this is best-effort local counting.
    }
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("nexinus:invalid-proof", { detail: { reason } }));
  }
  return m;
}

export function clearInvalidProofMetrics(): void {
  if (typeof localStorage !== "undefined") localStorage.removeItem(KEY);
}
