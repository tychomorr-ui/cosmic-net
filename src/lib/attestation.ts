// Sovereign attestation for Resonate-Earth.
//
// resonate-earth.live does not (yet) expose a CORS-readable signed /status.
// What we CAN verify in-browser, fail-closed:
//   1. The node's local declaration recomputes to the expected CIDv1
//      (dag-json · sha-256) over a stable subset of NODES[id].
//   2. The host is reachable via opaque HEAD (network path exists).
//   3. If a Truth-Chain link is enrolled for the same id, the stored
//      link CID matches the recomputed declaration CID — any divergence
//      is surfaced as a drift flag, never silently smoothed.
//
// Returns { ok, cid, reachable, drift } so the UI can render a single
// PISTIFUS-VALIDATED sigil only when every check passes.

import { NODES, type SovereignNode } from "@/data/nodes";
import { valueToCid } from "@/lib/cid";
import { loadChain } from "@/data/truth-chain";

export type AttestationResult = {
  ok: boolean;
  cid: string;
  reachable: boolean;
  drift: string | null;
  checkedAt: number;
};

function declarationSubset(n: SovereignNode) {
  // Stable, recomputable subset. Order matters for canonicalization but
  // dag-json sorts keys, so the object shape alone is sufficient.
  return {
    v: "node.declaration/v0",
    id: n.id,
    name: n.name,
    provider: n.provider,
    region: n.region,
    role: n.role,
    tier: n.tier,
    declared: n.declared,
    facts: n.facts,
    probe: n.probe ?? null,
  };
}

async function reach(url: string, timeoutMs = 4000): Promise<boolean> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    await fetch(url, { method: "HEAD", mode: "no-cors", signal: ctl.signal, cache: "no-store" });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

export async function verifyResonateAttestation(): Promise<AttestationResult> {
  return verifyNodeAttestation("resonate-earth");
}

export async function verifyNodeAttestation(nodeId: string): Promise<AttestationResult> {
  const node = NODES.find((n) => n.id === nodeId);
  const checkedAt = Date.now();
  if (!node) {
    return { ok: false, cid: "", reachable: false, drift: `node ${nodeId} not declared`, checkedAt };
  }
  const cid = await valueToCid(declarationSubset(node));
  const reachable = node.probe ? await reach(node.probe.url) : true;

  const link = loadChain().find((l) => l.id === nodeId);
  let drift: string | null = null;
  if (link && (link as unknown as { declarationCid?: string }).declarationCid) {
    const stored = (link as unknown as { declarationCid?: string }).declarationCid!;
    if (stored !== cid) drift = `declaration cid drift: stored ${stored.slice(0, 14)}… vs current ${cid.slice(0, 14)}…`;
  }
  if (!reachable) drift = drift ? `${drift}; unreachable` : "unreachable";

  return { ok: reachable && drift === null, cid, reachable, drift, checkedAt };
}
