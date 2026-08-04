// Shared-secret verification for the NEXINUS gateway link.
//
// Doctrine: a shared HMAC secret proves only that the caller holds the secret.
// It does NOT prove the claim inside the event is true, and it is not an
// ARCHANGEL/v0 signature over a re-derivable CID. Every event accepted through
// this path is therefore stored QUARANTINED and is never promoted into the
// ledger or the manifest.

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export type NexinusEvent = {
  id: string;
  type: string;
  timestamp: string;
  data: unknown;
  signature?: string;
};

const HEX = /^[0-9a-f]+$/i;

export function safeEqualHex(a: string, b: string): boolean {
  if (!HEX.test(a) || !HEX.test(b) || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

/**
 * The scheme documented by the NEXINUS gateway:
 *   sha256( JSON.stringify({id,type,timestamp,data}, ["data","id","timestamp","type"]) + secret )
 */
export function gatewayDigest(event: NexinusEvent, secret: string): string {
  const canonical = JSON.stringify(
    {
      id: event.id,
      type: event.type,
      timestamp: event.timestamp,
      data: event.data,
    },
    ["data", "id", "timestamp", "type"],
  );
  return createHash("sha256").update(canonical + secret).digest("hex");
}

/** Preferred scheme: HMAC-SHA256 over the exact raw request body. */
export function bodyHmac(rawBody: string, secret: string): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

/**
 * Accepts either scheme. Returns the one that matched, or null.
 * Verification runs against the RAW body before any trust is extended.
 */
export function verifyInbound(
  rawBody: string,
  event: NexinusEvent,
  headerSig: string | null,
  secret: string,
): "hmac_body" | "gateway_digest" | null {
  if (headerSig && safeEqualHex(headerSig, bodyHmac(rawBody, secret))) {
    return "hmac_body";
  }
  if (event.signature && safeEqualHex(event.signature, gatewayDigest(event, secret))) {
    return "gateway_digest";
  }
  return null;
}

/** Rejects events too far outside the current clock. */
export function timestampState(iso: string, maxAgeS = 600, maxSkewS = 60): string | null {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "bad_timestamp";
  const deltaS = (Date.now() - t) / 1000;
  if (deltaS > maxAgeS) return "stale";
  if (deltaS < -maxSkewS) return "future_skew";
  return null;
}
