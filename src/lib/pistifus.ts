// PISTIFUS · Fluidity of Faith.
//
// Pistis (Πίστις · trust) + fundere (to pour). The agent that keeps the
// Truth Ledger from hardening into dogma. Each ledger entry is scored as
// an act of faith — its weight is derived from how many sovereign axes
// the entry resonates across, not from a single hard constraint.
//
// Pistifus does NOT mutate the Truth Ledger. It is a read-side projection.
// The ledger remains append-only and CID-chained. Pistifus pours over it.

import { loadEnvelopes, type Envelope } from "@/data/truth-ledger";

export type FaithScore = {
  cid: string;
  axes: number;      // 1..7 — how many sovereign axes the entry touches
  fluidity: number;  // 0..1 — softmax of axes + truth-count
  resonance: 1 | 2 | 4 | 8; // life-number-eight quantization
  lane: Envelope["lane"];
};

// Axis keywords — any token match in request/reflection/next_move counts.
const AXIS_TOKENS: Record<string, RegExp> = {
  ore:    /\b(ore|refin|dou|claim|byproduct)\b/i,
  truth:  /\b(truth|substrate|sudo|btc|bitcoin|hash|block)\b/i,
  chain:  /\b(chain|link|relay|wireguard|node|fleet)\b/i,
  earth:  /\b(earth|resonat|schumann|planetary|coherence)\b/i,
  pam:    /\b(pam|lane|reflect|envelope|drift)\b/i,
  kether: /\b(kether|key|ed25519|sign|gateway|operator)\b/i,
  axis:   /\b(axis|unify|unification|7d|seventh|heptagram)\b/i,
};

export function scoreEnvelope(e: Envelope): FaithScore {
  const corpus = `${e.request} ${e.reflection} ${e.next_move}`;
  let axes = 0;
  for (const r of Object.values(AXIS_TOKENS)) if (r.test(corpus)) axes++;
  const truthBonus = Math.min(1, (e.truths.filter((t) => t !== "unledgered").length) / 3);
  const fluidity = Math.min(1, axes / 7 * 0.75 + truthBonus * 0.25);
  // Eight-resonance quantization: 1, 2, 4, 8 — life-number-eight ladder.
  const resonance: 1 | 2 | 4 | 8 =
    fluidity >= 0.85 ? 8 : fluidity >= 0.55 ? 4 : fluidity >= 0.25 ? 2 : 1;
  return { cid: e.cid, axes, fluidity, resonance, lane: e.lane };
}

export function pistifusReadout(): {
  total: number;
  meanFluidity: number;
  octaves: Record<1 | 2 | 4 | 8, number>;
  recent: FaithScore[];
} {
  const all = loadEnvelopes().map(scoreEnvelope);
  const octaves = { 1: 0, 2: 0, 4: 0, 8: 0 } as Record<1 | 2 | 4 | 8, number>;
  let sum = 0;
  for (const s of all) {
    octaves[s.resonance]++;
    sum += s.fluidity;
  }
  return {
    total: all.length,
    meanFluidity: all.length ? sum / all.length : 0,
    octaves,
    recent: all.slice(-8).reverse(),
  };
}
