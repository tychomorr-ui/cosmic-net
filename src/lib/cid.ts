// Sovereign content addressing. Pure-JS, browser + worker safe.
// Every artifact gets a CIDv1 (dag-json, sha-256). Anyone with the bytes
// can recompute and verify — no pinning service required.

import * as dagJson from "@ipld/dag-json";
import { CID } from "multiformats/cid";
import { sha256 } from "multiformats/hashes/sha2";
import * as raw from "multiformats/codecs/raw";

const DAG_JSON_CODE = 0x0129;

/** Encode a JSON-serializable value to canonical dag-json bytes. */
export function canonicalize(value: unknown): Uint8Array {
  return dagJson.encode(value);
}

/** Compute a CIDv1 (dag-json, sha-256) for an arbitrary value. */
export async function valueToCid(value: unknown): Promise<string> {
  const bytes = canonicalize(value);
  const hash = await sha256.digest(bytes);
  return CID.createV1(DAG_JSON_CODE, hash).toString();
}

/** Compute a CIDv1 (raw, sha-256) for opaque bytes. */
export async function bytesToCid(bytes: Uint8Array): Promise<string> {
  const hash = await sha256.digest(bytes);
  return CID.createV1(raw.code, hash).toString();
}

/** Verify a value hashes back to the claimed CID. */
export async function verifyValueCid(value: unknown, claimed: string): Promise<boolean> {
  try {
    const computed = await valueToCid(value);
    return computed === claimed;
  } catch {
    return false;
  }
}
