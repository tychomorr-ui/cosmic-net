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
// In both cases the response `pub` (when present) MUST equal the expected pubkey.

import { verifyNodeStatus } from "./sovereign-keys";
import type { ProbeStatus } from "./probes";
import { splitSigned, type SignedStatus } from "@cosmic-mesh/protocol";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

export type NodeStatus = SignedStatus;

type ReferenceEnvelope = {
  v: "ARCHANGEL/v0";
  node: string;
  ts: number;
  payload: Record<string, unknown>;
  payload_cid: string;
  sig: string;
  pub: string;
};

function canonical(obj: unknown): string {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) return JSON.stringify(obj);
  const o = obj as Record<string, unknown>;
  const keys = Object.keys(o).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonical(o[k])).join(",") + "}";
}

function isReference(body: unknown): body is ReferenceEnvelope {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    b.v === "ARCHANGEL/v0" &&
    typeof b.payload_cid === "string" &&
    typeof b.sig === "string" &&
    typeof b.pub === "string" &&
    typeof b.ts === "number" &&
    typeof b.payload === "object"
  );
}

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

    // Shape A: reference envelope.
    if (isReference(body)) {
      if (body.pub.toLowerCase() !== expectedEdPubHex.toLowerCase()) {
        return { state: "reachable", at, detail: `200 · pub mismatch (${body.pub.slice(0, 12)}…)` };
      }
      const recomputedCid = bytesToHex(sha256(utf8ToBytes(canonical(body.payload))));
      if (recomputedCid !== body.payload_cid.toLowerCase()) {
        return { state: "reachable", at, detail: "200 · payload_cid drift" };
      }
      const msg = `${body.payload_cid}|${body.ts}`;
      const ok = verifyNodeStatus(msg, body.sig, body.pub);
      if (!ok) return { state: "reachable", at, detail: "200 · signature invalid" };
      const ageS = Math.max(0, Math.floor(Date.now() / 1000) - body.ts);
      if (ageS > 180) return { state: "reachable", at, detail: `200 · signed but stale ${ageS}s` };
      return { state: "measured", at, detail: `signed · cid matched · ${ageS}s fresh` };
    }

    // Shape B: daemon ARCHANGEL/v0 (wg/socks5/dns).
    let canon: string;
    let sig: string;
    try {
      ({ canonical: canon, sig } = splitSigned(body as SignedStatus));
    } catch (e) {
      return {
        state: "reachable",
        at,
        detail: e instanceof Error ? `200 · ${e.message}` : "200 · malformed payload",
      };
    }
    const valid = verifyNodeStatus(canon, sig, expectedEdPubHex);
    if (valid !== true) return { state: "reachable", at, detail: "200 · signature invalid" };
    const wgBlock = (body as SignedStatus).wg;
    const stale = wgBlock.last_handshake_max_age_s > 180;
    return {
      state: "measured",
      at,
      detail: stale
        ? `signed · wg stale ${wgBlock.last_handshake_max_age_s}s`
        : `signed · ${wgBlock.peers} peers · ${(body as SignedStatus).socks5.active_conns} conns`,
    };
  } catch (e) {
    return { state: "unreachable", at, detail: e instanceof Error ? e.message : "network error" };
  } finally {
    clearTimeout(timer);
  }
}
