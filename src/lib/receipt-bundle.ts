// Shareable, content-addressed receipt bundle.
//
// A .receipt.json is a self-contained JSON document that anyone can
// re-verify offline:
//   - the SHA-256 of the original artifact
//   - the CIDv1 (raw, sha-256) of the same bytes
//   - the artifact's filename and size
//   - optional .ots bytes (base64), so a verifier can run `ots verify`
//   - optional operator-recorded BTC anchor (block_height, txid)
//   - a self-CID that addresses the receipt itself (excluding the
//     self_cid field, so it's stable)
//
// No network call is required to verify a bundle. The verifier hashes
// the supplied artifact, recomputes the CID, compares to the claimed
// values, and reports the anchor as-recorded. Honest by construction.

import { bytesToCid, valueToCid } from "@/lib/cid";
import type { Anchor } from "@/lib/anchors";

export type ReceiptBundle = {
  v: "nexinus.receipt/v1";
  generated_at: number;
  artifact: {
    filename: string;
    bytes: number;
    sha256: string;       // 64-hex lowercase
    cid: string;          // CIDv1 raw
  };
  ots?: {
    filename: string;
    bytes: number;
    base64: string;       // raw .ots bytes
  };
  anchor?: Anchor;        // operator-recorded, if any
  self_cid?: string;      // CIDv1 over the bundle minus self_cid
};

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

export function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function buildReceipt(args: {
  filename: string;
  bytes: Uint8Array;
  ots?: { filename: string; bytes: Uint8Array };
  anchor?: Anchor;
}): Promise<ReceiptBundle> {
  const sha = await sha256Hex(args.bytes);
  const cid = await bytesToCid(args.bytes);
  const bundle: ReceiptBundle = {
    v: "nexinus.receipt/v1",
    generated_at: Date.now(),
    artifact: { filename: args.filename, bytes: args.bytes.length, sha256: sha, cid },
    ots: args.ots
      ? { filename: args.ots.filename, bytes: args.ots.bytes.length, base64: toBase64(args.ots.bytes) }
      : undefined,
    anchor: args.anchor,
  };
  // Stable self-CID: hash everything except self_cid and generated_at.
  const stable = { ...bundle, generated_at: 0, self_cid: undefined };
  bundle.self_cid = await valueToCid(stable);
  return bundle;
}

export type VerificationReport = {
  shape_ok: boolean;
  self_cid_ok: boolean;
  sha_match: boolean | "no-artifact";
  cid_match: boolean | "no-artifact";
  ots_size_match: boolean | "no-ots";
  anchor: Anchor | null;
  computed: { sha256?: string; cid?: string };
  errors: string[];
};

export function isReceiptShape(v: unknown): v is ReceiptBundle {
  if (!v || typeof v !== "object") return false;
  const b = v as Partial<ReceiptBundle>;
  if (b.v !== "nexinus.receipt/v1") return false;
  if (!b.artifact || typeof b.artifact !== "object") return false;
  const a = b.artifact;
  return (
    typeof a.filename === "string" &&
    typeof a.bytes === "number" &&
    typeof a.sha256 === "string" &&
    /^[a-f0-9]{64}$/.test(a.sha256) &&
    typeof a.cid === "string"
  );
}

export async function verifyReceipt(
  bundle: ReceiptBundle,
  artifactBytes?: Uint8Array,
): Promise<VerificationReport> {
  const errors: string[] = [];
  const report: VerificationReport = {
    shape_ok: isReceiptShape(bundle),
    self_cid_ok: false,
    sha_match: "no-artifact",
    cid_match: "no-artifact",
    ots_size_match: "no-ots",
    anchor: bundle.anchor ?? null,
    computed: {},
    errors,
  };
  if (!report.shape_ok) {
    errors.push("bundle does not match nexinus.receipt/v1 shape");
    return report;
  }
  // self_cid check
  const stable = { ...bundle, generated_at: 0, self_cid: undefined };
  const recomputed = await valueToCid(stable);
  report.self_cid_ok = recomputed === bundle.self_cid;
  if (!report.self_cid_ok) errors.push(`self_cid mismatch (got ${recomputed})`);

  if (artifactBytes) {
    const sha = await sha256Hex(artifactBytes);
    const cid = await bytesToCid(artifactBytes);
    report.computed = { sha256: sha, cid };
    report.sha_match = sha === bundle.artifact.sha256.toLowerCase();
    report.cid_match = cid === bundle.artifact.cid;
    if (!report.sha_match) errors.push("artifact SHA-256 does not match");
    if (!report.cid_match) errors.push("artifact CID does not match");
    if (artifactBytes.length !== bundle.artifact.bytes) {
      errors.push(`size mismatch: ${artifactBytes.length} vs ${bundle.artifact.bytes}`);
    }
  }
  if (bundle.ots) {
    const decoded = fromBase64(bundle.ots.base64);
    report.ots_size_match = decoded.length === bundle.ots.bytes;
    if (!report.ots_size_match) errors.push("ots base64 size mismatch");
  }
  return report;
}
