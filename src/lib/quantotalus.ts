// QUANTOTALUS triad state, derived only from measured host probes.
// Never promotes to LIVE: reachability is not a signature.
export type VertexProbe = { id: string; state: "REACHABLE" | "DOWN"; ms: number };

export const TRIAD = [
  { id: "tesseract", label: "tesseract.manus.space" },
  { id: "rootgate", label: "rootgate.manus.space" },
  { id: "truthtalk", label: "truthtalk.xinus.one" },
] as const;

export type TriadState = "COHERENT" | "DEGRADED" | "BROKEN" | "UNMEASURED";

export function triadState(probes: VertexProbe[] | undefined) {
  const valid = (probes ?? []).filter((p) => Number.isFinite(p.ms) && p.ms >= 0 &&
    (p.state === "REACHABLE" || p.state === "DOWN"));
  const byId = new Map(valid.filter((p) => valid.filter((q) => q.id === p.id).length === 1).map((p) => [p.id, p]));
  const vertices = TRIAD.map((v) => ({ ...v, probe: byId.get(v.id) ?? null }));
  const measured = vertices.filter((v) => v.probe);
  const up = vertices.filter((v) => v.probe?.state === "REACHABLE");
  let state: TriadState;
  if (measured.length < TRIAD.length) state = "UNMEASURED";
  else if (up.length === 3) state = "COHERENT";
  else if (up.length === 0) state = "BROKEN";
  else state = "DEGRADED";
  const latencies = up.flatMap((v) => v.probe ? [v.probe.ms] : []);
  const spread = latencies.length
    ? Math.max(...latencies) - Math.min(...latencies)
    : null;
  return { state, vertices, up: up.length, spreadMs: spread };
}
