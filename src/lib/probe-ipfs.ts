// IPFS-gated signed-status probe. Resolves an ARCHANGEL/v0 envelope pinned
// to IPFS via one or more public gateways. LIVE only on signature verification;
// gateway 200 alone is REACHABLE at best.

import type { ProbeStatus } from "./probes";
import { verifyEnvelope } from "./signed-envelope";
import { DEFAULT_IPFS_GATEWAYS } from "@/data/nodes";

export async function probeIpfsSigned(
  cid: string,
  expectedEdPubHex: string,
  gateways: string[] = DEFAULT_IPFS_GATEWAYS,
  timeoutMs = 5000,
): Promise<ProbeStatus> {
  if (!cid) {
    return { state: "unreachable", at: Date.now(), detail: "ipfs · no CID pinned" };
  }
  let lastErr = "no gateway responded";
  for (const gw of gateways) {
    const url = gw.endsWith("/") ? `${gw}${cid}` : `${gw}/${cid}`;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    const at = Date.now();
    try {
      const res = await fetch(url, { mode: "cors", signal: ctl.signal, cache: "no-store" });
      if (!res.ok) {
        lastErr = `HTTP ${res.status} @ ${new URL(gw).host}`;
        continue;
      }
      const body = (await res.json()) as unknown;
      const status = verifyEnvelope(body, expectedEdPubHex, at, `ipfs:${new URL(gw).host}`);
      // Any non-idle status from a gateway is authoritative for this attempt.
      if (status.state === "measured" || status.state === "reachable") return status;
      lastErr = "detail" in status ? status.detail : "unknown";
    } catch (e) {
      lastErr = e instanceof Error ? e.message : "network error";
    } finally {
      clearTimeout(timer);
    }
  }
  return { state: "unreachable", at: Date.now(), detail: `ipfs · ${lastErr}` };
}
