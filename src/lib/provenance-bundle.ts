// Local-only Provenance Bundle export.
//
// Produces a single self-contained JSON file ("Final Manifest bundle") that
// folds together:
//   - the current Golden Truth manifest (with its CIDv1)
//   - every operator-recorded BTC anchor (the verified OTS artifacts)
//   - SHA-256 over each receipt and over the bundle payload itself
//
// No network. No telemetry. Pure function of local state.

import { buildFinalManifest, type FinalManifest } from "@/lib/final-manifest";
import { listAnchors, type Anchor } from "@/lib/anchors";

export type VerifiedArtifact = {
  sha256: string;
  block_height: number;
  txid?: string;
  anchored_at: number;
  source: Anchor["source"];
  note?: string;
};

export type ProvenanceBundle = {
  v: "cmap.provenance-bundle/v1";
  generated_at: number;
  golden_truth_cid: string;
  manifest: FinalManifest;
  verified_artifacts: VerifiedArtifact[];
  artifact_count: number;
  receipt_count: number;
  anchored_count: number;
  pending_count: number;
  coupling: FinalManifest["coupling"];
  // sha256 (hex) over the canonical JSON of this object with
  // `bundle_sha256` set to "" — enables third-party re-check.
  bundle_sha256: string;
};

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  const buf = await crypto.subtle.digest("SHA-256", ab);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function canonicalJson(value: unknown): string {
  // Stable key ordering for deterministic hashing.
  const sort = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sort);
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(v as Record<string, unknown>).sort()) {
        out[k] = sort((v as Record<string, unknown>)[k]);
      }
      return out;
    }
    return v;
  };
  return JSON.stringify(sort(value));
}

export async function buildProvenanceBundle(): Promise<{
  bundle: ProvenanceBundle;
  json: string;
}> {
  const { manifest, cid } = await buildFinalManifest();
  const anchors = listAnchors();

  const verified: VerifiedArtifact[] = anchors
    .map((a) => ({
      sha256: a.sha256,
      block_height: a.block_height,
      txid: a.txid,
      anchored_at: a.anchored_at,
      source: a.source,
      note: a.note,
    }))
    .sort((a, b) => a.block_height - b.block_height);

  const draft: ProvenanceBundle = {
    v: "cmap.provenance-bundle/v1",
    generated_at: Date.now(),
    golden_truth_cid: cid,
    manifest,
    verified_artifacts: verified,
    artifact_count: verified.length,
    receipt_count: manifest.receipts_total,
    anchored_count: manifest.anchored_count,
    pending_count: manifest.pending_count,
    coupling: manifest.coupling,
    bundle_sha256: "",
  };

  // Compute bundle hash over a version with `generated_at: 0` and
  // `bundle_sha256: ""` so re-running over the same state yields the same
  // hash — content-defined, not clock-defined.
  const stable = { ...draft, generated_at: 0, bundle_sha256: "" };
  const stableBytes = new TextEncoder().encode(canonicalJson(stable));
  const bundleSha = await sha256Hex(stableBytes);

  const bundle: ProvenanceBundle = { ...draft, bundle_sha256: bundleSha };
  const json = JSON.stringify(bundle, null, 2);
  return { bundle, json };
}

export function downloadProvenanceBundle(bundle: ProvenanceBundle, json: string) {
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date(bundle.generated_at).toISOString().replace(/[:.]/g, "-");
  a.href = url;
  a.download = `provenance-bundle-${stamp}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
