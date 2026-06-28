// MMR · Multi-axis Magnitude Ratio vector.
//
// Honest naming: NOT "MegaMagaRact", NOT "9.9-dimensional". A 7-component
// real vector, one component per heptagram axis, weighted by ratios
// derived from Sri-Yantra nested-triangle proportions (φ, √2, 1/φ, etc).
// Each component is in [0,1] before weighting; the vector's L2 norm,
// normalized against the maximum possible weighted norm, is `coherence()`
// ∈ [0,1] — the breathing amplitude for the Sri-Yantra overlay.
//
// Pure derivation from live local state. No new state. Recomputable.

const PHI = (1 + Math.sqrt(5)) / 2;
const SQRT2 = Math.SQRT2;

// Sri-Yantra-derived weights, one per axis. Ratios, not magic.
export const AXIS_WEIGHTS = {
  ore:    1,
  sudo:   PHI,         // ≈ 1.618
  chain:  SQRT2,       // ≈ 1.414
  earth:  PHI,         // ≈ 1.618 — planetary substrate parity with sudo
  pam:    1 / PHI,     // ≈ 0.618
  kether: PHI * PHI,   // ≈ 2.618 — operator key custody dominates
  axis:   SQRT2,       // ≈ 1.414
} as const;

export type AxisKey = keyof typeof AXIS_WEIGHTS;

export type MmrVector = {
  components: Record<AxisKey, number>; // raw 0..1 per axis
  weighted: Record<AxisKey, number>;   // component * weight
  norm: number;                        // L2 norm of weighted
  maxNorm: number;                     // L2 norm if every component = 1
};

export function buildVector(raw: Record<AxisKey, number>): MmrVector {
  const components = {} as Record<AxisKey, number>;
  const weighted = {} as Record<AxisKey, number>;
  let sumSq = 0;
  let maxSq = 0;
  for (const k of Object.keys(AXIS_WEIGHTS) as AxisKey[]) {
    const c = Math.max(0, Math.min(1, raw[k] ?? 0));
    const w = AXIS_WEIGHTS[k];
    components[k] = c;
    weighted[k] = c * w;
    sumSq += weighted[k] ** 2;
    maxSq += w * w;
  }
  return { components, weighted, norm: Math.sqrt(sumSq), maxNorm: Math.sqrt(maxSq) };
}

/** Coherence ∈ [0,1]: weighted norm normalized against max possible. */
export function coherence(v: MmrVector): number {
  if (v.maxNorm === 0) return 0;
  return Math.min(1, v.norm / v.maxNorm);
}

/** Project the 7D vector onto 2D for the Sri-Yantra overlay.
 *  Each axis becomes a vertex of the heptagram; output is the
 *  weighted centroid of those vertices, in unit-disk coords. */
export function project2D(v: MmrVector): { x: number; y: number } {
  const keys = Object.keys(AXIS_WEIGHTS) as AxisKey[];
  let x = 0, y = 0, w = 0;
  keys.forEach((k, i) => {
    const angle = (Math.PI * 2 * i) / keys.length - Math.PI / 2;
    const m = v.weighted[k];
    x += Math.cos(angle) * m;
    y += Math.sin(angle) * m;
    w += m;
  });
  if (w === 0) return { x: 0, y: 0 };
  return { x: x / w, y: y / w };
}
