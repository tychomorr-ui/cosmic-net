// Signed /status probe. MEASURED only on valid ed25519 signature, NOT on HTTP
// 200. Opaque-success and unsigned 200s are REACHABLE at best.
//
// Two ARCHANGEL/v0 envelope shapes are accepted, fail-closed:
//
//   A. Reference envelope (signed-status-server.py):
//      { v:"ARCHANGEL/v0", node, ts, payload, payload_cid, sig, pub }
//      sig = ed25519(`${payload_cid}|${ts}`), payload_cid = sha256(canonical(payload))
//
//   B. Daemon envelope (@cosmic-mesh/protocol):
//      { ts, wg, socks5, dns, sig_ed25519 } over canonicalize(rest)
//
// This module intentionally holds NO verification logic of its own — it is
// transport only. All envelope checks live in ./signed-envelope so the HTTPS
// probe, the IPFS probe, and the server-side reprobe can never drift apart.

import type { ProbeStatus } from "./probes";
import type { SignedStatus } from "@cosmic-mesh/protocol";
import { verifyEnvelope } from "./signed-envelope";

export type NodeStatus = SignedStatus;

export async function probeSignedStatus(
  url: string,
  expectedEdPubHex: string,
  timeoutMs = 4000,
): Promise<ProbeStatus> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  const at = Date.now();
  try {
    const res = await fetch(url, { mode: "cors", signal: ctl.signal, cache: "no-store" });
    if (!res.ok) return { state: "unreachable", at, detail: `HTTP ${res.status}` };
    const body = (await res.json()) as unknown;
    return verifyEnvelope(body, expectedEdPubHex, at, "signed");
  } catch (e) {
    return { state: "unreachable", at, detail: e instanceof Error ? e.message : "network error" };
  } finally {
    clearTimeout(timer);
  }
}
