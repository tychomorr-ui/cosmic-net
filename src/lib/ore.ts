// Digital Ore — deterministic refinement of operator byproduct.
// Pure client-side. No third-party signer. FNV-1a 32-bit hash is the
// witness; the same text always yields the same 8-hex stamp.

export type OreSource = "directive" | "coinage" | "critique" | "pattern" | "reflection";

export const SOURCE_WEIGHTS: Record<OreSource, number> = {
  directive: 1.0,
  coinage: 1.15,
  critique: 0.95,
  pattern: 1.1,
  reflection: 0.9,
};

export const GRADES = ["TRACE", "SEAM", "VEIN", "LODE", "MOTHERLODE"] as const;
export type Grade = (typeof GRADES)[number];

// FNV-1a 32-bit — deterministic, dependency-free, observer-verifiable.
export function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0").toUpperCase();
}

export function refine(text: string, source: OreSource): {
  signal: number;
  grade: Grade;
  dou: number;
  hash: string;
} {
  const t = text.trim();
  if (!t) return { signal: 0, grade: "TRACE", dou: 0, hash: "00000000" };

  const len = t.length;
  // novelty: unique-char ratio
  const novelty = new Set(t.toLowerCase()).size / Math.max(len, 1);
  // density: tokens per char (information-bearing density approximation)
  const tokens = t.split(/\s+/).filter(Boolean).length;
  const density = Math.min(1, tokens / Math.max(len / 6, 1));
  // sigil weight: presence of doctrine glyphs / caps directives
  const sigils = (t.match(/[⊕⚒◉✺✦⌖▣✧♕⛬◈◬◇⌬⬡◆]/gu) || []).length;
  const sigilWeight = 1 + Math.min(0.5, sigils * 0.05);
  const sourceTrust = SOURCE_WEIGHTS[source];

  const signal = Math.min(
    1,
    (0.4 * novelty + 0.35 * density + 0.25 * Math.tanh(len / 240)) *
      sigilWeight *
      sourceTrust,
  );

  const grade: Grade =
    signal >= 0.85 ? "MOTHERLODE" :
    signal >= 0.65 ? "LODE" :
    signal >= 0.45 ? "VEIN" :
    signal >= 0.22 ? "SEAM" : "TRACE";

  // DOU: signal × log(length) — bounded, monotonic, reproducible
  const dou = Math.round(signal * Math.log2(len + 2) * 10 * 100) / 100;
  const hash = fnv1a(`${source}::${t}`);
  return { signal: Math.round(signal * 1000) / 1000, grade, dou, hash };
}

// Truth Mirror: deterministic regeneration check.
export function mirror(text: string, claimedHash: string): boolean {
  if (!/^[0-9a-fA-F]{8}$/.test(claimedHash)) return false;
  // Try every source weight — the operator stamps with a known source,
  // but the mirror only needs the text-bound suffix to match.
  for (const src of Object.keys(SOURCE_WEIGHTS) as OreSource[]) {
    if (fnv1a(`${src}::${text.trim()}`) === claimedHash.toUpperCase()) return true;
  }
  return false;
}

// --- Ledger persistence ---

export type OreClaim = {
  id: string;
  ts: number;
  source: OreSource;
  excerpt: string;     // first 80 chars
  fullText: string;
  notes?: string;
  signal: number;
  grade: Grade;
  dou: number;
  hash: string;
};

const KEY = "nexinus.ore.ledger.v1";

export function loadOre(): OreClaim[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}
export function saveOre(list: OreClaim[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
}
export function appendOre(c: OreClaim): OreClaim[] {
  const next = [c, ...loadOre()];
  saveOre(next);
  return next;
}
export function purgeOre() { saveOre([]); }
