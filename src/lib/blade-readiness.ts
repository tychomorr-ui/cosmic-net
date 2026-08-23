// Blade Readiness Registry — honest join of BLADES × NODES × signed-status
// probe entries from terminus-ops.json.
//
// Honest framing:
//   "READY" is reserved for blades whose underlying node has been verified
//   as MEASURED (signed-status, ARCHANGEL/v0 envelope, ed25519 sig valid).
//   UI-only blades (no network surface) are reported as RENDERED — the
//   surface paints, but there is no node to verify. AWAITING / purged
//   blades stay AWAITING and carry their declared reason.
//
// No telemetry. Pure read over already-present static data.

import { BLADES, type Blade } from "@/data/blades";
import { NODES, type SovereignNode } from "@/data/nodes";
import opsRaw from "@/data/terminus-ops.json";

export type ReadinessState =
  | "READY"           // node coupled · ARCHANGEL/v0 verified
  | "REACHABLE"       // host answered but unsigned (no envelope)
  | "RENDERED"        // UI surface paints · no node coupling by design
  | "AWAITING"        // declared but not live
  | "DOCTRINE"        // intent only, no probe declared
  | "PURGED";         // removed by doctrine sweep

export type ProbeFacts = {
  nodeId: string;
  state: "MEASURED" | "REACHABLE" | "UNREACHABLE" | "DOCTRINE" | "UNKNOWN";
  detail: string;
  payload_cid?: string;
  expected_pub?: string;
  ts: string;
};

export type BladeReadiness = {
  blade: Blade;
  node?: SovereignNode;
  probe?: ProbeFacts;
  state: ReadinessState;
  reason: string;
};

// Static blade → node coupling. Only the three real nodes have a network
// surface; the rest of the blades are UI surfaces (rendered or purged) and
// MUST NOT be reported as bound to a node they don't actually verify.
const BLADE_NODE_BINDING: Record<string, string> = {
  "04": "resonate-earth",     // Network NEBULA samm mist-flow vertex
  "07": "root-gate",          // TERMINUS · ops surface against the control plane
  "13": "tesseract-a",        // PROOF FULCRUM · operator stamp / fleet witness
};

type OpsEntry = {
  ts: string;
  level: string;
  subsystem: string;
  command: string;
  result: string;
  sessionId: string;
};

/** Latest signed-status probe per node id, parsed out of terminus-ops.json. */
export function latestSignedStatusByNode(): Map<string, ProbeFacts> {
  const out = new Map<string, ProbeFacts>();
  for (const e of opsRaw as OpsEntry[]) {
    if (e.subsystem !== "PROBE") continue;
    const m = /^signed-status:(.+)$/.exec(e.command);
    if (!m) continue;
    const nodeId = m[1];
    // Newer-wins: terminus-ops is append-only but unordered on disk; keep
    // the entry with the most recent ts.
    const prior = out.get(nodeId);
    if (prior && Date.parse(prior.ts) >= Date.parse(e.ts)) continue;

    const stateLine = /\nstate:\s*([A-Z_]+)/.exec(e.result);
    const detailLine = /\ndetail:\s*(.+?)(?:\n|$)/.exec(e.result);
    const cidLine = /\npayload_cid:\s*([0-9a-f]+)/.exec(e.result);
    const pubLine = /\nexpected_pub:\s*([0-9a-f]+)/.exec(e.result);

    const rawState = stateLine?.[1] ?? "UNKNOWN";
    const normalized: ProbeFacts["state"] =
      rawState === "MEASURED" || rawState === "REACHABLE" ||
      rawState === "UNREACHABLE" || rawState === "DOCTRINE"
        ? rawState
        : "UNKNOWN";

    out.set(nodeId, {
      nodeId,
      state: normalized,
      detail: detailLine?.[1]?.trim() ?? "",
      payload_cid: cidLine?.[1],
      expected_pub: pubLine?.[1],
      ts: e.ts,
    });
  }
  return out;
}

export function computeRegistry(
  overrides?: Map<string, ProbeFacts>,
): BladeReadiness[] {
  const base = latestSignedStatusByNode();
  const probes = new Map(base);
  if (overrides) for (const [k, v] of overrides) probes.set(k, v);
  return BLADES.map((blade) => {
    const nodeId = BLADE_NODE_BINDING[blade.n];
    const node = nodeId ? NODES.find((n) => n.id === nodeId) : undefined;
    const probe = nodeId ? probes.get(nodeId) : undefined;

    // Purged blades are pinned by doctrine, regardless of probe state.
    const purgedReason = blade.tagline.toLowerCase().includes("purged");
    if (purgedReason) {
      return {
        blade,
        state: "PURGED" as const,
        reason: blade.tagline,
      };
    }

    if (node && probe) {
      if (probe.state === "MEASURED") {
        return {
          blade, node, probe,
          state: "READY" as const,
          reason: `ARCHANGEL/v0 verified · ${probe.detail}`,
        };
      }
      if (probe.state === "REACHABLE") {
        return {
          blade, node, probe,
          state: "REACHABLE" as const,
          reason: `host reachable · unsigned · ${probe.detail}`,
        };
      }
      if (probe.state === "UNREACHABLE") {
        return {
          blade, node, probe,
          state: "AWAITING" as const,
          reason: `node unreachable · ${probe.detail}`,
        };
      }
      return {
        blade, node, probe,
        state: "DOCTRINE" as const,
        reason: probe.detail || "no probe declared",
      };
    }

    if (blade.status === "LIVE") {
      return {
        blade,
        state: "RENDERED" as const,
        reason: "UI surface paints · no node coupling by design",
      };
    }
    return {
      blade,
      state: "DOCTRINE" as const,
      reason: blade.blocker ?? blade.tagline,
    };
  });
}

export function readinessSummary(rows: BladeReadiness[]) {
  const tally = { READY: 0, REACHABLE: 0, RENDERED: 0, AWAITING: 0, DOCTRINE: 0, PURGED: 0 };
  for (const r of rows) tally[r.state] += 1;
  return { total: rows.length, ...tally };
}
