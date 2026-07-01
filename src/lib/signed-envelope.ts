// Shared ARCHANGEL/v0 envelope verification. Used by both the direct
// signed-status HTTPS probe and the IPFS-gated probe. Fail-closed.

import { verifyNodeStatus } from "./sovereign-keys";
import type { ProbeStatus } from "./probes";
import { splitSigned, type SignedStatus } from "@cosmic-mesh/protocol";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";

export type ReferenceEnvelope = {
  v: "ARCHANGEL/v0";
  node: string;
  ts: number;
  payload: Record<string, unknown>;
  payload_cid: string;
  sig: string;
  pub: string;
};

export function canonical(obj: unknown): string {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) return JSON.stringify(obj);
  const o = obj as Record<string, unknown>;
  const keys = Object.keys(o).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonical(o[k])).join(",") + "}";
}

export function isReference(body: unknown): body is ReferenceEnvelope {
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

/** Verify an ARCHANGEL/v0 envelope (either shape). Returns a ProbeStatus. */
export function verifyEnvelope(
  body: unknown,
  expectedEdPubHex: string,
  at: number,
  sourceTag = "signed",
): ProbeStatus {
  if (isReference(body)) {
    if (body.pub.toLowerCase() !== expectedEdPubHex.toLowerCase()) {
      return { state: "reachable", at, detail: `${sourceTag} · pub mismatch (${body.pub.slice(0, 12)}…)` };
    }
    const recomputedCid = bytesToHex(sha256(utf8ToBytes(canonical(body.payload))));
    if (recomputedCid !== body.payload_cid.toLowerCase()) {
      return { state: "reachable", at, detail: `${sourceTag} · payload_cid drift` };
    }
    const msg = `${body.payload_cid}|${body.ts}`;
    if (!verifyNodeStatus(msg, body.sig, body.pub)) {
      return { state: "reachable", at, detail: `${sourceTag} · signature invalid` };
    }
    const ageS = Math.max(0, Math.floor(Date.now() / 1000) - body.ts);
    if (ageS > 180) return { state: "reachable", at, detail: `${sourceTag} · stale ${ageS}s` };
    return { state: "measured", at, detail: `${sourceTag} · cid matched · ${ageS}s fresh` };
  }

  // Daemon shape
  try {
    const { canonical: canon, sig } = splitSigned(body as SignedStatus);
    if (verifyNodeStatus(canon, sig, expectedEdPubHex) !== true) {
      return { state: "reachable", at, detail: `${sourceTag} · signature invalid` };
    }
    const wgBlock = (body as SignedStatus).wg;
    const stale = wgBlock.last_handshake_max_age_s > 180;
    return {
      state: "measured",
      at,
      detail: stale
        ? `${sourceTag} · wg stale ${wgBlock.last_handshake_max_age_s}s`
        : `${sourceTag} · ${wgBlock.peers} peers · ${(body as SignedStatus).socks5.active_conns} conns`,
    };
  } catch (e) {
    return {
      state: "reachable",
      at,
      detail: e instanceof Error ? `${sourceTag} · ${e.message}` : `${sourceTag} · malformed payload`,
    };
  }
}
