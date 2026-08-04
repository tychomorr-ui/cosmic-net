import { createServerFn } from "@tanstack/react-start";
import { FEDERATION_PEERS } from "@/data/peers";

export type PeerProbe = {
  id: string;
  /** REACHABLE = HTTP 2xx. DEGRADED = reachable host, non-2xx. DOWN = no response. */
  state: "REACHABLE" | "DEGRADED" | "DOWN";
  status: number | null;
  /** Machine-readable reason when not REACHABLE. */
  reason: string | null;
  /** Whether the response carried an ARCHANGEL/v0 signed envelope. */
  signed: boolean;
  ms: number;
  checkedAt: string;
};

async function probeOne(url: string): Promise<Omit<PeerProbe, "id">> {
  const started = Date.now();
  const checkedAt = new Date().toISOString();
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { accept: "*/*" },
      signal: AbortSignal.timeout(8000),
    });
    const body = await response.text();
    let signed = false;
    try {
      const parsed = JSON.parse(body) as Record<string, unknown>;
      signed =
        typeof parsed["sig"] === "string" &&
        typeof parsed["pub"] === "string" &&
        typeof parsed["payload_cid"] === "string";
    } catch {
      signed = false;
    }
    return {
      state: response.ok ? "REACHABLE" : "DEGRADED",
      status: response.status,
      reason: response.ok ? null : `http_${response.status}`,
      signed,
      ms: Date.now() - started,
      checkedAt,
    };
  } catch (error) {
    return {
      state: "DOWN",
      status: null,
      reason: error instanceof Error ? error.name.toLowerCase() : "unreachable",
      signed: false,
      ms: Date.now() - started,
      checkedAt,
    };
  }
}

/** Live reachability probe for every federation peer. Fails open per peer. */
export const probePeers = createServerFn({ method: "GET" }).handler(
  async (): Promise<PeerProbe[]> =>
    Promise.all(
      FEDERATION_PEERS.map(async (peer) => ({
        id: peer.id,
        ...(await probeOne(peer.probeUrl)),
      })),
    ),
);
