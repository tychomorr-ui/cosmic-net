// QUANTOTALUS triad state, derived only from measured host probes.
// Never promotes to LIVE: reachability is not a signature.
export type VertexProbe = { id: string; state: "REACHABLE" | "DOWN"; ms: number };

export const TRIAD = [
  { id: "root-gate", label: "Oregon" },
  { id: "xinus-clarity", label: "Ireland" },
  { id: "kether-gate", label: "Singapore" },
] as const;

export type TriadState = "COHERENT" | "DEGRADED" | "BROKEN" | "UNMEASURED";

export function triadState(probes: VertexProbe[] | undefined) {
  const byId = new Map((probes ?? []).map((p) => [p.id, p]));
  const vertices = TRIAD.map((v) => ({ ...v, probe: byId.get(v.id) ?? null }));
  const measured = vertices.filter((v) => v.probe);
  const up = vertices.filter((v) => v.probe?.state === "REACHABLE");
  let state: TriadState;
  if (measured.length < TRIAD.length) state = "UNMEASURED";
  else if (up.length === 3) state = "COHERENT";
  else if (up.length === 0) state = "BROKEN";
  else state = "DEGRADED";
  const spread = up.length
    ? Math.max(...up.map((v) => v.probe!.ms)) - Math.min(...up.map((v) => v.probe!.ms))
    : null;
  return { state, vertices, up: up.length, spreadMs: spread };
}
