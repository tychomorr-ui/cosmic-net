// Publicly-verified BTC anchors, operator-recorded via `ots verify` and
// baked into the shipped build. Anyone visiting the /ledger route sees
// the same anchor set — this is the shared, public source of truth.
//
// To add a new anchor: run `ots verify <file>.ots` locally, then append
// the SHA-256 → { block_height, txid?, note } binding here. Every entry
// must be independently reproducible by re-running `ots verify` against
// the original bytes. No fabrication.

import type { Anchor } from "@/lib/anchors";

export type KnownAnchor = Omit<Anchor, "anchored_at" | "source"> & {
  anchored_at: number;
  note: string;
};

export const KNOWN_ANCHORS: Record<string, KnownAnchor> = {
  "e53a1476254301804e25b5f27787f64dc882dee0bca0b3865ace40b6ead285a9": {
    sha256: "e53a1476254301804e25b5f27787f64dc882dee0bca0b3865ace40b6ead285a9",
    anchored_at: 1782796200000,
    block_height: 956029,
    note: "golden-truth.manifest.json — META-ANCHOR (the manifest itself), 2026-06-29 PST",
  },
  "325037bda158c135794fb097f365822e7c5da01147282cb3cde032bc5e251f02": {
    sha256: "325037bda158c135794fb097f365822e7c5da01147282cb3cde032bc5e251f02",
    anchored_at: 1782774403019,
    block_height: 955974,
    note: "truth-substrate-ledger-01-1.mhtml",
  },
  "e54f67b589ff65af66e12f219e2693b8f341e26ec52ee89a69f57cfa2f30d0bc": {
    sha256: "e54f67b589ff65af66e12f219e2693b8f341e26ec52ee89a69f57cfa2f30d0bc",
    anchored_at: 1782774403019,
    block_height: 955967,
    note: "The XinUS Movement.txt",
  },
  "0faeb10d3cf69ec65907f3de833d413f132a935aa7dd90d3557e7d5a18838ec3": {
    sha256: "0faeb10d3cf69ec65907f3de833d413f132a935aa7dd90d3557e7d5a18838ec3",
    anchored_at: 1782774403019,
    block_height: 955974,
    note: "GO_OMNI_GO-001.txt",
  },
  "0de8ed98f41bd656686793c67dec9108b5e29c10ccd6cb8fe272cbfab76c590b": {
    sha256: "0de8ed98f41bd656686793c67dec9108b5e29c10ccd6cb8fe272cbfab76c590b",
    anchored_at: 1782758859621,
    block_height: 955889,
    note: "digital-ore-1782710516222.json — 2026-06-28 PST",
  },
  "fcff668eca6effffacd2c62dcc6209c34c97595ac3e98e8bbdff5fdfb3df4c66": {
    sha256: "fcff668eca6effffacd2c62dcc6209c34c97595ac3e98e8bbdff5fdfb3df4c66",
    anchored_at: 1782758859621,
    block_height: 955897,
    note: "ots-verify.py — 2026-06-28 PST",
  },
  "8c426dc600f932157c4397e4303f8c09186ff0c5c8a73ada17550632b4abfa45": {
    sha256: "8c426dc600f932157c4397e4303f8c09186ff0c5c8a73ada17550632b4abfa45",
    anchored_at: 1782758859621,
    block_height: 955889,
    note: "Universal Justice Manifesto · Sovereign Runtime Declaration",
  },
  "9aa2f93e0f74ff33441e77affd0fdb7004ae0524a86cf6960107a74af203c48b": {
    sha256: "9aa2f93e0f74ff33441e77affd0fdb7004ae0524a86cf6960107a74af203c48b",
    anchored_at: 1781766000000,
    block_height: 954165,
    note: "sovereign-activation-chain-001.txt — 2026-06-17 PST",
  },
  "d9b45f924a82850005079c667e786b6e4a3205ddb8bb56b973a5f975757ec7ca": {
    sha256: "d9b45f924a82850005079c667e786b6e4a3205ddb8bb56b973a5f975757ec7ca",
    anchored_at: 1781766000000,
    block_height: 954161,
    note: "sovereign-universal-digital-ore-origin.txt — 2026-06-17 PST",
  },
  "4edab582bd0eb5a72ad58df4fe677d2af685e254539b9e72c78ebc95f5ef70f7": {
    sha256: "4edab582bd0eb5a72ad58df4fe677d2af685e254539b9e72c78ebc95f5ef70f7",
    anchored_at: 1781766000000,
    block_height: 954181,
    note: "truth-coin-manifesto-001.txt — 2026-06-17 PST",
  },
  "ffd582ed528d2f7cba4fceefbddbe876f5a8d7f2adf6b81b8ff36698e42ad0a1": {
    sha256: "ffd582ed528d2f7cba4fceefbddbe876f5a8d7f2adf6b81b8ff36698e42ad0a1",
    anchored_at: 1781766000000,
    block_height: 954181,
    note: "trc-feasibility-001.txt — 2026-06-17 PST",
  },
  "8f21bb6e58e67ef925170b39b66d9bb78c2f416553919a0c57b8cb7509809a30": {
    sha256: "8f21bb6e58e67ef925170b39b66d9bb78c2f416553919a0c57b8cb7509809a30",
    anchored_at: 1784862000000,
    block_height: 959472,
    note: "truthcoin-audit-bundle.txt — independent third-party audit engagement bundle",
  },
};

export function getKnownAnchor(sha256: string): Anchor | undefined {
  const k = KNOWN_ANCHORS[sha256.toLowerCase()];
  if (!k) return undefined;
  return { ...k, source: "ots-verify" };
}
