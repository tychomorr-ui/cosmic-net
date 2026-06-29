// Final Manifest — the "Golden Truth" tile on /ops.
//
// Aggregates:
//   - every SHA-256 receipt parsed from terminus-ops.json
//   - the operator-recorded BTC anchors (see anchors.ts)
//   - the current Reclaim payload_cid (deterministic state hash)
//
// Produces a single CIDv1 (dag-json) over the canonical structure. The
// manifest is "golden" only when every receipt has a matching anchor AND
// the payload_cid is present. Otherwise it honestly reports what's
// missing — no opaque green light.

import { valueToCid } from "@/lib/cid";
import { parseProvenance, type ProvenanceReceipt } from "@/lib/provenance";
import { listAnchors, getAnchor, type Anchor } from "@/lib/anchors";
import { exportBundle } from "@/lib/reclaim";

export type ManifestReceipt = {
  ts: string;
  subsystem: string;
  command: string;
  sha256: string;
  ots_files: string[];
  anchor: Anchor | null; // null when still PENDING
};

export type FinalManifest = {
  v: "cmap.final-manifest/v1";
  generated_at: number;
  payload_cid: string;             // current Reclaim payload CID (state coupling)
  receipts: ManifestReceipt[];     // sorted by ts desc, then sha
  anchors_total: number;
  receipts_total: number;
  anchored_count: number;
  pending_count: number;
  coupling: "golden" | "partial" | "pending";
};

export type FinalManifestResult = {
  manifest: FinalManifest;
  cid: string;
};

function flatten(receipts: ProvenanceReceipt[]): Omit<ManifestReceipt, "anchor">[] {
  const out: Omit<ManifestReceipt, "anchor">[] = [];
  for (const r of receipts) {
    for (const sha of r.hashes) {
      out.push({
        ts: r.ts,
        subsystem: r.subsystem,
        command: r.command,
        sha256: sha,
        ots_files: r.otsFiles,
      });
    }
  }
  return out.sort((a, b) =>
    a.ts === b.ts ? a.sha256.localeCompare(b.sha256) : a.ts < b.ts ? 1 : -1,
  );
}

export async function buildFinalManifest(): Promise<FinalManifestResult> {
  const receipts = parseProvenance();
  const flat = flatten(receipts);

  const enriched: ManifestReceipt[] = flat.map((r) => ({
    ...r,
    anchor: getAnchor(r.sha256) ?? null,
  }));

  const anchored = enriched.filter((r) => r.anchor !== null).length;
  const pending = enriched.length - anchored;

  // payload_cid couples the Reclaim state to the manifest.
  const { receipt } = await exportBundle();
  const payload_cid = receipt.payload_cid;

  const coupling: FinalManifest["coupling"] =
    enriched.length > 0 && pending === 0
      ? "golden"
      : anchored > 0
        ? "partial"
        : "pending";

  const manifest: FinalManifest = {
    v: "cmap.final-manifest/v1",
    generated_at: Date.now(),
    payload_cid,
    receipts: enriched,
    anchors_total: listAnchors().length,
    receipts_total: enriched.length,
    anchored_count: anchored,
    pending_count: pending,
    coupling,
  };

  // CID is computed over a version without `generated_at` so re-computing
  // the same state yields the same CID — golden truth is content-defined,
  // not timestamp-defined.
  const stable = { ...manifest, generated_at: 0 };
  const cid = await valueToCid(stable);

  return { manifest, cid };
}
