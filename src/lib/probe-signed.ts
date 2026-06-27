// Signed /status probe. MEASURED only on valid ed25519 signature over the
// canonical payload, NOT on HTTP 200. Opaque-success and unsigned 200s are
// REACHABLE at best.

import { verifyNodeStatus } from "./sovereign-keys";
import type { ProbeStatus } from "./probes";

export type NodeStatus = {
  ts: number;
  wg: { iface: string; peers: number; last_handshake_max_age_s: number };
  socks5: { listen: string; active_conns: number };
  dns: { zone: string; records: number };
  sig_ed25519: string;
};

// Canonical form: stable key order, no whitespace, drop sig field.
function canonicalize(o: Omit<NodeStatus, "sig_ed25519">): string {
  return JSON.stringify({
    dns: { records: o.dns.records, zone: o.dns.zone },
    socks5: { active_conns: o.socks5.active_conns, listen: o.socks5.listen },
    ts: o.ts,
    wg: {
      iface: o.wg.iface,
      last_handshake_max_age_s: o.wg.last_handshake_max_age_s,
      peers: o.wg.peers,
    },
  });
}

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
    if (!body.sig_ed25519) {
      return { state: "reachable", at, detail: "200 · unsigned payload" };
    }
    const { sig_ed25519, ...rest } = body;
    const canon = canonicalize(rest);
    const valid = verifyNodeStatus(canon, sig_ed25519, expectedEdPubHex);
    if (!valid) return { state: "reachable", at, detail: "200 · signature invalid" };
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
