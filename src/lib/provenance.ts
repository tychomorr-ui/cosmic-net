// Parse OpenTimestamps / SHA256 provenance receipts out of terminus-ops.json.
// Pure-string extraction — no network, no fabrication. If a hash isn't in the
// ledger text, it doesn't appear in the UI.

import { OPS_LOG, type OpsEntry } from "@/data/ops";

export type ProvenanceReceipt = {
  ts: string;
  subsystem: string;
  command: string;
  hashes: string[];          // 64-char lowercase sha256 hex
  otsFiles: string[];        // *.ots filenames mentioned in result
  verified: boolean;         // result text claims VERIFIED
  excerpt: string;           // first ~240 chars of result
};

const SHA256_RE = /\b[a-f0-9]{64}\b/g;
const OTS_RE = /[\w.\-]+\.ots\b/g;

export function parseProvenance(entries: OpsEntry[] = OPS_LOG): ProvenanceReceipt[] {
  const out: ProvenanceReceipt[] = [];
  for (const e of entries) {
    const text = `${e.command}\n${e.result}`;
    const hashes = Array.from(new Set(text.match(SHA256_RE) ?? []));
    const otsFiles = Array.from(new Set(text.match(OTS_RE) ?? []));
    if (hashes.length === 0 && otsFiles.length === 0) continue;
    out.push({
      ts: e.ts,
      subsystem: e.subsystem,
      command: e.command,
      hashes,
      otsFiles,
      verified: /VERIFIED/i.test(e.result),
      excerpt: e.result.slice(0, 240),
    });
  }
  return out.sort((a, b) => (a.ts < b.ts ? 1 : -1));
}
