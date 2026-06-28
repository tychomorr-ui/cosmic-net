// Signed /status probe. MEASURED only on valid ed25519 signature over the
// canonical payload, NOT on HTTP 200. Opaque-success and unsigned 200s are
// REACHABLE at best.
//
// Wire types + canonicalizer come from @cosmic-mesh/protocol — the single
// source of truth shared with the Go daemon (../packages/protocol/spec/).
// Golden vectors in CI guarantee byte-identical canonical output between
// stacks; any drift would silently invalidate every signature.

import { verifyNodeStatus } from "./sovereign-keys";
import type { ProbeStatus } from "./probes";
import { splitSigned, type SignedStatus } from "@cosmic-mesh/protocol";

// Re-export the wire type under its historical name so existing call sites
// don't churn during the M1 protocol-extraction commit.
export type NodeStatus = SignedStatus;

export async function probeSignedStatus(
  url: string,
  expectedEdPubHex: string,
  timeoutMs = 4000,
): Promise<ProbeStatus & { payload?: NodeStatus }> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  const at = Date.now();
  try {
    const res = await fetch(url, { mode: "cors", signal: ctl.signal, cache: "no-store" });
    if (!res.ok) return { state: "unreachable", at, detail: `HTTP ${res.status}` };
    const body = (await res.json()) as NodeStatus;
    let canon: string;
    let sig: string;
    try {
      ({ canonical: canon, sig } = splitSigned(body));
    } catch (e) {
      return {
        state: "reachable",
        at,
        detail: e instanceof Error ? `200 · ${e.message}` : "200 · malformed payload",
      };
    }
    const valid = verifyNodeStatus(canon, sig, expectedEdPubHex);
    // Fail-closed: any non-true result is UNVERIFIED.
    if (valid !== true) return { state: "reachable", at, detail: "200 · signature invalid" };
    const stale = body.wg.last_handshake_max_age_s > 180;
    return {
      state: "measured",
      at,
      detail: stale
        ? `signed · wg stale ${body.wg.last_handshake_max_age_s}s`
        : `signed · ${body.wg.peers} peers · ${body.socks5.active_conns} conns`,
    };
  } catch (e) {
    return { state: "unreachable", at, detail: e instanceof Error ? e.message : "network error" };
  } finally {
    clearTimeout(timer);
  }
}

