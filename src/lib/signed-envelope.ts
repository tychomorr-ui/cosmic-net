// Shared ARCHANGEL/v0 envelope verification. THE single verification path —
// used by the direct signed-status HTTPS probe, the IPFS-gated probe, and the
// scheduled server-side reprobe. Fail-closed.
//
// AUDIT NOTE (mesh Ed25519 path, 2026-07):
//   - Two copies of this logic previously existed (probe-signed.ts had its own
//     canonicalizer + verifier). That is a spoof surface: any divergence means
//     one caller accepts an envelope the other rejects. Deduplicated here.
//   - canonical() now REFUSES to serialize anything it cannot canonicalize
//     deterministically (arrays of objects, non-finite numbers) instead of
//     falling through to JSON.stringify with insertion-order keys.
//   - Future `ts` is now rejected. Previously age was clamped with Math.max(0,…)
//     so an envelope stamped years ahead read as "0s fresh" forever.
//   - sig / pub / payload_cid are shape-checked as lowercase hex of the exact
//     expected length before any crypto call.

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

/** Max envelope age before it stops counting as MEASURED. */
export const ENVELOPE_MAX_AGE_S = 180;
/** Clock skew tolerated on a future-dated `ts` before it is treated as forged. */
export const ENVELOPE_MAX_SKEW_S = 30;

const HEX64 = /^[0-9a-f]{64}$/;
const HEX128 = /^[0-9a-f]{128}$/;

/**
 * Deterministic JSON. Throws on any value whose serialization is not
 * canonicalizable across implementations — the caller MUST treat a throw as
 * verification failure, never as a pass.
 */
export function canonical(obj: unknown): string {
  if (obj === null) return "null";
  const t = typeof obj;
  if (t === "string" || t === "boolean") return JSON.stringify(obj);
  if (t === "number") {
    if (!Number.isFinite(obj as number)) throw new Error("non-finite number");
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) return "[" + obj.map((v) => canonical(v)).join(",") + "]";
  if (t === "object") {
    const o = obj as Record<string, unknown>;
    const keys = Object.keys(o).sort();
    return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonical(o[k])).join(",") + "}";
  }
  throw new Error(`uncanonicalizable value: ${t}`);
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
    typeof b.payload === "object" &&
    b.payload !== null &&
    !Array.isArray(b.payload)
  );
}

/** Verify an ARCHANGEL/v0 envelope (either shape). Returns a ProbeStatus. */
export function verifyEnvelope(
  body: unknown,
  expectedEdPubHex: string,
  at: number,
  sourceTag = "signed",
): ProbeStatus {
  const reject = (why: string): ProbeStatus => ({
    state: "reachable",
    at,
    detail: `${sourceTag} · ${why}`,
  });

  if (isReference(body)) {
    try {
      const pub = body.pub.toLowerCase();
      const sig = body.sig.toLowerCase();
      const cid = body.payload_cid.toLowerCase();

      if (!HEX64.test(pub)) return reject("pub malformed");
      if (!HEX128.test(sig)) return reject("signature invalid");
      if (!HEX64.test(cid)) return reject("payload_cid drift");
      if (!Number.isSafeInteger(body.ts) || body.ts <= 0) return reject("ts malformed");
      if (pub !== expectedEdPubHex.toLowerCase()) {
        return reject(`pub mismatch (${body.pub.slice(0, 12)}…)`);
      }

      const recomputedCid = bytesToHex(sha256(utf8ToBytes(canonical(body.payload))));
      if (recomputedCid !== cid) return reject("payload_cid drift");

      // Signature binds the CID to the timestamp, so both are covered.
      if (verifyNodeStatus(`${cid}|${body.ts}`, sig, pub) !== true) {
        return reject("signature invalid");
      }

      const nowS = Math.floor(Date.now() / 1000);
      const ageS = nowS - body.ts;
      if (ageS < -ENVELOPE_MAX_SKEW_S) return reject(`ts in future by ${-ageS}s`);
      if (ageS > ENVELOPE_MAX_AGE_S) return reject(`stale ${ageS}s`);

      return { state: "measured", at, detail: `${sourceTag} · cid matched · ${Math.max(0, ageS)}s fresh` };
    } catch (e) {
      return reject(e instanceof Error ? e.message : "envelope rejected");
    }
  }

  // Daemon shape
  try {
    const { canonical: canon, sig } = splitSigned(body as SignedStatus);
    if (verifyNodeStatus(canon, sig, expectedEdPubHex) !== true) {
      return reject("signature invalid");
    }
    const wgBlock = (body as SignedStatus).wg;
    const stale = wgBlock.last_handshake_max_age_s > ENVELOPE_MAX_AGE_S;
    return {
      state: "measured",
      at,
      detail: stale
        ? `${sourceTag} · wg stale ${wgBlock.last_handshake_max_age_s}s`
        : `${sourceTag} · ${wgBlock.peers} peers · ${(body as SignedStatus).socks5.active_conns} conns`,
    };
  } catch (e) {
    return reject(e instanceof Error ? e.message : "malformed payload");
  }
}
