// Digital Ore — refinement aligned with contracts/src/DigitalOre.sol.
// Every score is an integer 0..100 computed from the recorded text and the
// declared source. grade = n*d*s*t/100 (0..GRADE_SCALE), exactly as on-chain.
// Witness hash is SHA-256 over `ore/v2::source::text`. Scores are local proxies:
// empty text or a grade that rounds to zero produces no claim, mirroring
// the contract's GradeRoundsToZero revert.
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

export type OreSource = "directive" | "coinage" | "critique" | "pattern" | "reflection";

/** Operator-declared source policy (multipliers). Rescaled to 0..100 for the contract. */
export const SOURCE_WEIGHTS: Record<OreSource, number> = {
  directive: 1.0, coinage: 1.15, critique: 0.95, pattern: 1.1, reflection: 0.9,
};
const MAX_WEIGHT = 1.15;

export const GRADE_SCALE = 1_000_000;
export const GRADES = ["TRACE", "SEAM", "VEIN", "LODE", "MOTHERLODE"] as const;
export type Grade = (typeof GRADES)[number];
/** Classification policy on grade / GRADE_SCALE. Off-chain only; the contract stores the raw grade. */
export const TIER_FLOORS: Record<Grade, number> = { TRACE: 0, SEAM: 0.05, VEIN: 0.15, LODE: 0.3, MOTHERLODE: 0.5 };

const SIGILS = /[⊕⚒◉✺✦⌖▣✧♕⛬◈◬◇⌬⬡◆]/gu;

export function oreHash(source: OreSource, text: string): string {
  return bytesToHex(sha256(utf8ToBytes(`ore/v2::${source}::${text.trim()}`)));
}
export function linkHash(prev: string | null, hash: string): string {
  return bytesToHex(sha256(utf8ToBytes(`ore/v2/link::${prev ?? "genesis"}::${hash}`)));
}

/** Shannon entropy of code points, normalised by log2(min(len, 256)). */
export function noveltyScore(t: string): number {
  const cps = Array.from(t);
  if (cps.length < 2) return 0;
  const f = new Map<string, number>();
  for (const c of cps) f.set(c, (f.get(c) ?? 0) + 1);
  let h = 0;
  for (const n of f.values()) { const p = n / cps.length; h -= p * Math.log2(p); }
  return Math.min(100, Math.round((100 * h) / Math.log2(Math.min(cps.length, 256))));
}
/** Lexical density: distinct words / total words. */
export function densityScore(t: string): number {
  const w = t.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  return w.length ? Math.round((100 * new Set(w).size) / w.length) : 0;
}
/** Former 1..1.5 sigil multiplier, rescaled to 0..100 (no sigils = 67). */
export function sigilScore(t: string): number {
  const s = (t.match(SIGILS) ?? []).length;
  return Math.round((100 * (1 + Math.min(0.5, s * 0.05))) / 1.5);
}
export function trustScore(source: OreSource): number {
  return Math.round((100 * SOURCE_WEIGHTS[source]) / MAX_WEIGHT);
}
/** Identical integer math to DigitalOre.refineByproduct. */
export function contractGrade(n: number, d: number, s: number, t: number): number {
  for (const x of [n, d, s, t]) if (!Number.isInteger(x) || x < 0 || x > 100) throw new Error("InvalidScores");
  return Math.floor((n * d * s * t) / 100);
}
export function tierOf(grade: number): Grade {
  const f = grade / GRADE_SCALE;
  return [...GRADES].reverse().find((g) => f >= TIER_FLOORS[g]) ?? "TRACE";
}

export type Refined = {
  scores: { novelty: number; density: number; sigilWeight: number; sourceTrust: number };
  grade: number; tier: Grade; signal: number; hash: string;
};
/** Returns null when there is nothing to refine or the grade rounds to zero. */
export function refine(text: string, source: OreSource): Refined | null {
  const t = text.trim();
  if (!t) return null;
  const scores = { novelty: noveltyScore(t), density: densityScore(t), sigilWeight: sigilScore(t), sourceTrust: trustScore(source) };
  const grade = contractGrade(scores.novelty, scores.density, scores.sigilWeight, scores.sourceTrust);
  if (grade === 0) return null;
  return { scores, grade, tier: tierOf(grade), signal: grade / GRADE_SCALE, hash: oreHash(source, t) };
}

export function mirror(text: string, claimedHash: string): boolean {
  if (!/^[0-9a-f]{64}$/i.test(claimedHash.trim())) return false;
  return (Object.keys(SOURCE_WEIGHTS) as OreSource[]).some((s) => oreHash(s, text) === claimedHash.trim().toLowerCase());
}

// --- Ledger ---
export type OreClaim = {
  v: 2; id: string; ts: number; source: OreSource; excerpt: string; fullText: string; notes?: string;
  scores: Refined["scores"]; grade: number; tier: Grade; hash: string; prev: string | null; link: string;
};

export type TraceStatus = "VERIFIED" | "DRIFT" | "BROKEN_LINK" | "LEGACY";
export type Trace = { id: string; status: TraceStatus; reason: string | null };

/** Re-derive every claim from its recorded text (newest-first list). */
export function traceLedger(list: unknown[]): Trace[] {
  const out: Trace[] = [];
  const asc = [...list].reverse();
  const ids = new Map<string, number>();
  for (const raw of asc) {
    if (raw && typeof raw === "object" && "id" in raw) {
      const id = String(raw.id);
      ids.set(id, (ids.get(id) ?? 0) + 1);
    }
  }
  let prevLink: string | null = null;
  let broken = false;
  for (const raw of asc) {
    const c = (raw && typeof raw === "object" ? raw : {}) as Partial<OreClaim>;
    const id = String(c.id ?? "?");
    if (c.v !== 2 || typeof c.fullText !== "string" || !c.source || !Object.hasOwn(SOURCE_WEIGHTS, c.source)) {
      out.push({ id, status: "LEGACY", reason: "pre-v2 record; not re-derivable under contract math" });
      continue;
    }
    const r = refine(c.fullText, c.source);
    if (!r || r.hash !== c.hash || r.grade !== c.grade || r.tier !== c.tier ||
      !c.scores || Object.entries(r.scores).some(([k, v]) => c.scores?.[k as keyof Refined["scores"]] !== v) ||
      ids.get(id) !== 1) {
      out.push({ id, status: "DRIFT", reason: "recorded source, scores, grade, tier, hash or identity mismatch" });
      broken = true;
      prevLink = c.link ?? null; continue;
    }
    if (broken || c.prev !== prevLink || c.link !== linkHash(c.prev ?? null, r.hash)) {
      out.push({ id, status: "BROKEN_LINK", reason: "chain link does not match previous claim" });
      broken = true;
      prevLink = c.link ?? null; continue;
    }
    out.push({ id, status: "VERIFIED", reason: null });
    prevLink = c.link ?? null;
  }
  return out.reverse();
}

/** Loads computed only from VERIFIED claims. Vein load = grade ≥ VEIN; mother load = all verified grade (contract totalByproductAccrued). */
export function oreLoads(list: unknown[]) {
  const traces = traceLedger(list);
  const verified = (list as OreClaim[]).filter((_, i) => traces[i]?.status === "VERIFIED");
  const vein = verified.filter((c) => c.grade / GRADE_SCALE >= TIER_FLOORS.VEIN);
  return {
    verified: verified.length,
    excluded: list.length - verified.length,
    veinCount: vein.length,
    veinLoad: vein.reduce((s, c) => s + c.grade, 0),
    motherLoad: verified.reduce((s, c) => s + c.grade, 0),
    motherlodeCount: verified.filter((c) => c.tier === "MOTHERLODE").length,
  };
}

export function buildClaim(text: string, source: OreSource, prevList: unknown[], notes?: string, now = Date.now()): OreClaim | null {
  const r = refine(text, source);
  if (!r) return null;
  if (traceLedger(prevList).some((t) => t.status !== "VERIFIED" && t.status !== "LEGACY"))
    throw new Error("Ledger integrity fault — export the evidence before recording more claims");
  const head = (prevList[0] as Partial<OreClaim> | undefined);
  const prev = head?.v === 2 ? head.link ?? null : null;
  const t = text.trim();
  return { v: 2, id: `ore-${now.toString(36)}-${crypto.randomUUID()}`, ts: now, source, excerpt: t.slice(0, 80), fullText: t, notes,
    scores: r.scores, grade: r.grade, tier: r.tier, hash: r.hash, prev, link: linkHash(prev, r.hash) };
}

const KEY = "nexinus.ore.ledger.v1";
export function loadOre(): OreClaim[] {
  if (typeof window === "undefined") return [];
  try { const value: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]"); return Array.isArray(value) ? value.filter((c) => c && typeof c === "object") : []; } catch { return []; }
}
export function saveOre(list: OreClaim[]) {
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(list));
}
export function appendOre(c: OreClaim): OreClaim[] { const n = [c, ...loadOre()]; saveOre(n); return n; }
export function purgeOre() { saveOre([]); }
