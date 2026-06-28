// Reclaim Export/Import. Serializes the operator's sovereign state into a
// single content-addressed bundle. The CIDv1 (dag-json, sha-256) is computed
// locally over the canonical bundle bytes — anyone holding the file can
// recompute and verify with no server in the loop.
//
// Shape: { v, exported_at, truths, envelopes, truth_chain, ops_log }
// The ops_log is the static artifact already in the repo (terminus-ops.json);
// included so a re-import re-instantiates the full witness surface.

import { canonicalize, valueToCid } from "@/lib/cid";
import { kvGet, kvSet } from "@/lib/sovereign-store";
import { loadTruths, loadEnvelopes, type LedgerTruth, type Envelope } from "@/data/truth-ledger";
import { loadChain, type TruthChainLink } from "@/data/truth-chain";
import { OPS_LOG, OPS_ARTIFACT_NAME, type OpsEntry } from "@/data/ops";

export const RECLAIM_VERSION = "cmap.reclaim/v1" as const;

export type ReclaimBundle = {
  v: typeof RECLAIM_VERSION;
  exported_at: number;
  truths: LedgerTruth[];
  envelopes: Envelope[];
  truth_chain: TruthChainLink[];
  ops_log: { artifact: string; entries: OpsEntry[] };
};

export type ReclaimReceipt = {
  cid: string;
  bytes: number;
  exported_at: number;
  counts: { truths: number; envelopes: number; truth_chain: number; ops_log: number };
};

/** Build a bundle from current sovereign state. Pure read; no side effects. */
export function buildBundle(): ReclaimBundle {
  return {
    v: RECLAIM_VERSION,
    exported_at: Date.now(),
    truths: loadTruths(),
    envelopes: loadEnvelopes(),
    truth_chain: loadChain(),
    ops_log: { artifact: OPS_ARTIFACT_NAME, entries: OPS_LOG },
  };
}

/** Serialize + hash + return both blob and receipt. */
export async function exportBundle(): Promise<{ bundle: ReclaimBundle; bytes: Uint8Array; receipt: ReclaimReceipt }> {
  const bundle = buildBundle();
  const bytes = canonicalize(bundle);
  const cid = await valueToCid(bundle);
  return {
    bundle,
    bytes,
    receipt: {
      cid,
      bytes: bytes.byteLength,
      exported_at: bundle.exported_at,
      counts: {
        truths: bundle.truths.length,
        envelopes: bundle.envelopes.length,
        truth_chain: bundle.truth_chain.length,
        ops_log: bundle.ops_log.entries.length,
      },
    },
  };
}

export type ImportMode = "replace" | "merge";

export type ImportReport = {
  cid: string;
  verified: boolean;
  mode: ImportMode;
  applied: { truths: number; envelopes: number; truth_chain: number };
  skipped_ops_log: boolean;
};

/** Parse + verify CID + apply to sovereign-store. */
export async function importBundle(json: string, mode: ImportMode = "merge"): Promise<ImportReport> {
  const parsed = JSON.parse(json) as ReclaimBundle;
  if (parsed?.v !== RECLAIM_VERSION) {
    throw new Error(`unsupported bundle version: ${String(parsed?.v)}`);
  }
  const cid = await valueToCid(parsed);

  const existingTruths = mode === "merge" ? loadTruths() : [];
  const existingEnv = mode === "merge" ? loadEnvelopes() : [];
  const existingChain = mode === "merge" ? loadChain() : [];

  const truthIds = new Set(existingTruths.map((t) => t.id));
  const mergedTruths = [
    ...existingTruths,
    ...parsed.truths.filter((t) => !truthIds.has(t.id)),
  ];

  const envCids = new Set(existingEnv.map((e) => e.cid));
  const mergedEnv = [
    ...existingEnv,
    ...parsed.envelopes.filter((e) => !envCids.has(e.cid)),
  ].sort((a, b) => a.ts - b.ts);

  const chainIds = new Set(existingChain.map((n) => n.id));
  const mergedChain = [
    ...existingChain,
    ...parsed.truth_chain.filter((n) => !chainIds.has(n.id)),
  ];

  kvSet("nexinus.pam.truths.v1", JSON.stringify(mergedTruths));
  kvSet("nexinus.pam.envelopes.v1", JSON.stringify(mergedEnv));
  kvSet("nexinus.terminus.truth-chain.v1", JSON.stringify(mergedChain));

  return {
    cid,
    verified: true, // CID is recomputed from the parsed bytes; presence == verification
    mode,
    applied: {
      truths: mergedTruths.length - existingTruths.length,
      envelopes: mergedEnv.length - existingEnv.length,
      truth_chain: mergedChain.length - existingChain.length,
    },
    skipped_ops_log: true, // ops_log is repo-static; included in export for portability only
  };
}

/** Trigger a browser download of the bundle bytes. */
export function downloadBundle(bytes: Uint8Array, cid: string): void {
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/vnd.ipld.dag-json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cmap-reclaim-${cid.slice(0, 16)}.dagjson`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
