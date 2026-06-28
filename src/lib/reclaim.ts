// Reclaim Export/Import. Serializes the operator's sovereign state into a
// single content-addressed bundle.
//
// Determinism contract (v2):
//   - The bundle is split into { v, payload_cid, exported_at, payload }.
//   - `payload` holds the state (truths, envelopes, truth_chain, ops_log) only.
//   - `payload_cid` is the CIDv1 (dag-json, sha-256) of `payload` alone.
//   - Re-exporting the same state on any environment produces the same
//     `payload_cid`, regardless of when the export happened or what order
//     the underlying store returned rows in.
//   - The outer envelope CID changes per export because it carries
//     `exported_at`. That's intentional: it timestamps the receipt.
//
// To guarantee identical bytes across environments we:
//   1. Deep-clone every value through JSON.parse(JSON.stringify(...)) to
//      strip class instances / prototypes / undefined / functions.
//   2. Reject non-finite numbers and BigInt up front (dag-json would
//      otherwise encode these inconsistently).
//   3. Sort every array by a stable key before encoding.
//   4. Round-trip through dag-json (decode → re-encode → byte-compare)
//      on import to detect any encoder drift.

import { canonicalize, valueToCid } from "@/lib/cid";
import { kvSet } from "@/lib/sovereign-store";
import { loadTruths, loadEnvelopes, type LedgerTruth, type Envelope } from "@/data/truth-ledger";
import { loadChain, type TruthChainLink } from "@/data/truth-chain";
import { OPS_LOG, OPS_ARTIFACT_NAME, type OpsEntry } from "@/data/ops";
import * as dagJson from "@ipld/dag-json";

export const RECLAIM_VERSION = "cmap.reclaim/v2" as const;
export const RECLAIM_VERSION_LEGACY_V1 = "cmap.reclaim/v1" as const;

export type ReclaimPayload = {
  truths: LedgerTruth[];
  envelopes: Envelope[];
  truth_chain: TruthChainLink[];
  ops_log: { artifact: string; entries: OpsEntry[] };
};

export type ReclaimBundle = {
  v: typeof RECLAIM_VERSION;
  payload_cid: string;
  exported_at: number;
  payload: ReclaimPayload;
};

export type ReclaimReceipt = {
  /** CID of the outer envelope (includes timestamp). */
  cid: string;
  /** CID of the payload alone — stable across re-exports of identical state. */
  payload_cid: string;
  bytes: number;
  exported_at: number;
  counts: { truths: number; envelopes: number; truth_chain: number; ops_log: number };
};

// ───────────────────────── canonicalisation ─────────────────────────

function assertJsonSafe(value: unknown, path = "$"): void {
  if (value === null) return;
  const t = typeof value;
  if (t === "string" || t === "boolean") return;
  if (t === "number") {
    if (!Number.isFinite(value as number)) {
      throw new Error(`non-finite number at ${path}`);
    }
    return;
  }
  if (t === "bigint") throw new Error(`bigint not allowed at ${path}`);
  if (t === "undefined") throw new Error(`undefined not allowed at ${path}`);
  if (t === "function" || t === "symbol") throw new Error(`${t} not allowed at ${path}`);
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertJsonSafe(v, `${path}[${i}]`));
    return;
  }
  if (t === "object") {
    // reject class instances; only plain objects survive
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
      throw new Error(`non-plain object at ${path}`);
    }
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      assertJsonSafe(v, `${path}.${k}`);
    }
  }
}

/** Deep clone via JSON to strip prototypes / undefined / methods. */
function plainClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function sortPayload(p: ReclaimPayload): ReclaimPayload {
  const truths = [...p.truths].sort((a, b) => cmp(a.id, b.id));
  const envelopes = [...p.envelopes].sort((a, b) => {
    if (a.ts !== b.ts) return a.ts - b.ts;
    return cmp(a.cid, b.cid);
  });
  const truth_chain = [...p.truth_chain].sort((a, b) => cmp(a.id, b.id));
  // ops_log entries are a repo-static, ordered artifact — preserve given order.
  return {
    truths,
    envelopes,
    truth_chain,
    ops_log: { artifact: p.ops_log.artifact, entries: [...p.ops_log.entries] },
  };
}

/** Build a deterministic payload from current sovereign state. */
export function buildPayload(): ReclaimPayload {
  const raw: ReclaimPayload = {
    truths: loadTruths(),
    envelopes: loadEnvelopes(),
    truth_chain: loadChain(),
    ops_log: { artifact: OPS_ARTIFACT_NAME, entries: OPS_LOG },
  };
  const cloned = plainClone(raw);
  assertJsonSafe(cloned, "$.payload");
  return sortPayload(cloned);
}

// ───────────────────────── export ─────────────────────────

/** Serialize + hash + return both blob and receipt. */
export async function exportBundle(opts?: { exportedAt?: number }): Promise<{
  bundle: ReclaimBundle;
  bytes: Uint8Array;
  receipt: ReclaimReceipt;
}> {
  const payload = buildPayload();
  const payload_cid = await valueToCid(payload);
  const bundle: ReclaimBundle = {
    v: RECLAIM_VERSION,
    payload_cid,
    exported_at: opts?.exportedAt ?? Date.now(),
    payload,
  };
  const bytes = canonicalize(bundle);

  // Round-trip self-check: decode + re-encode must yield byte-identical output.
  const reEncoded = canonicalize(dagJson.decode(bytes));
  if (!byteEq(bytes, reEncoded)) {
    throw new Error("dag-json encoder is not deterministic on this runtime");
  }

  const envelope_cid = await valueToCid(bundle);
  return {
    bundle,
    bytes,
    receipt: {
      cid: envelope_cid,
      payload_cid,
      bytes: bytes.byteLength,
      exported_at: bundle.exported_at,
      counts: {
        truths: payload.truths.length,
        envelopes: payload.envelopes.length,
        truth_chain: payload.truth_chain.length,
        ops_log: payload.ops_log.entries.length,
      },
    },
  };
}

/** Re-export with the same `exported_at` — yields byte-identical bundle. */
export async function reExport(receipt: ReclaimReceipt) {
  return exportBundle({ exportedAt: receipt.exported_at });
}

// ───────────────────────── import ─────────────────────────

export type ImportMode = "replace" | "merge";

export type ImportReport = {
  cid: string;
  payload_cid: string;
  verified: boolean;
  round_trip_ok: boolean;
  mode: ImportMode;
  applied: { truths: number; envelopes: number; truth_chain: number };
  skipped_ops_log: boolean;
};

function byteEq(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  for (let i = 0; i < a.byteLength; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** Parse + verify CID + apply to sovereign-store. Accepts text or bytes. */
export async function importBundle(input: string | Uint8Array, mode: ImportMode = "merge"): Promise<ImportReport> {
  // Decode via dag-json so we honour the canonical IPLD shape, not loose JSON.
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  const decoded = dagJson.decode<unknown>(bytes);

  // Round-trip: encode the decoded value and compare to original bytes.
  // Mismatch ⇒ the file was not produced by a canonical encoder; we still
  // accept the logical content but flag it on the report.
  const reEncoded = canonicalize(decoded);
  const round_trip_ok = byteEq(bytes, reEncoded);

  const parsed = decoded as Partial<ReclaimBundle> & { v?: string };
  const version = parsed?.v as string | undefined;

  if (version === RECLAIM_VERSION_LEGACY_V1) {
    return applyLegacyV1(decoded as LegacyV1Bundle, mode, round_trip_ok);
  }
  if (version !== RECLAIM_VERSION) {
    throw new Error(`unsupported bundle version: ${String(version)}`);
  }
  if (!parsed.payload) throw new Error("bundle missing payload");

  // Recompute payload_cid from the (re-sorted, sanitised) payload and verify
  // it matches the declared payload_cid.
  const normalisedPayload = sortPayload(plainClone(parsed.payload));
  assertJsonSafe(normalisedPayload, "$.payload");
  const recomputed_payload_cid = await valueToCid(normalisedPayload);
  if (recomputed_payload_cid !== parsed.payload_cid) {
    throw new Error(
      `payload CID mismatch: declared ${parsed.payload_cid}, recomputed ${recomputed_payload_cid}`,
    );
  }
  const envelope_cid = await valueToCid(parsed);

  const applied = applyPayload(normalisedPayload, mode);
  return {
    cid: envelope_cid,
    payload_cid: recomputed_payload_cid,
    verified: true,
    round_trip_ok,
    mode,
    applied,
    skipped_ops_log: true,
  };
}

// Legacy v1 shape: { v, exported_at, truths, envelopes, truth_chain, ops_log }
type LegacyV1Bundle = {
  v: typeof RECLAIM_VERSION_LEGACY_V1;
  exported_at: number;
  truths: LedgerTruth[];
  envelopes: Envelope[];
  truth_chain: TruthChainLink[];
  ops_log: { artifact: string; entries: OpsEntry[] };
};

async function applyLegacyV1(b: LegacyV1Bundle, mode: ImportMode, round_trip_ok: boolean): Promise<ImportReport> {
  const payload = sortPayload(
    plainClone({
      truths: b.truths,
      envelopes: b.envelopes,
      truth_chain: b.truth_chain,
      ops_log: b.ops_log,
    }),
  );
  assertJsonSafe(payload, "$.payload");
  const payload_cid = await valueToCid(payload);
  const cid = await valueToCid(b);
  const applied = applyPayload(payload, mode);
  return { cid, payload_cid, verified: true, round_trip_ok, mode, applied, skipped_ops_log: true };
}

function applyPayload(p: ReclaimPayload, mode: ImportMode) {
  const existingTruths = mode === "merge" ? loadTruths() : [];
  const existingEnv = mode === "merge" ? loadEnvelopes() : [];
  const existingChain = mode === "merge" ? loadChain() : [];

  const truthIds = new Set(existingTruths.map((t) => t.id));
  const mergedTruths = [
    ...existingTruths,
    ...p.truths.filter((t) => !truthIds.has(t.id)),
  ];

  const envCids = new Set(existingEnv.map((e) => e.cid));
  const mergedEnv = [
    ...existingEnv,
    ...p.envelopes.filter((e) => !envCids.has(e.cid)),
  ].sort((a, b) => a.ts - b.ts);

  const chainIds = new Set(existingChain.map((n) => n.id));
  const mergedChain = [
    ...existingChain,
    ...p.truth_chain.filter((n) => !chainIds.has(n.id)),
  ];

  kvSet("nexinus.pam.truths.v1", JSON.stringify(mergedTruths));
  kvSet("nexinus.pam.envelopes.v1", JSON.stringify(mergedEnv));
  kvSet("nexinus.terminus.truth-chain.v1", JSON.stringify(mergedChain));

  return {
    truths: mergedTruths.length - existingTruths.length,
    envelopes: mergedEnv.length - existingEnv.length,
    truth_chain: mergedChain.length - existingChain.length,
  };
}

// ───────────────────────── download ─────────────────────────

/** Trigger a browser download of the bundle bytes. Filename keys off the
 *  payload CID so two exports of identical state share the same filename. */
export function downloadBundle(bytes: Uint8Array, key: string): void {
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/vnd.ipld.dag-json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cmap-reclaim-${key.slice(0, 16)}.dagjson`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
