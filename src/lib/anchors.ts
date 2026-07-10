// Provenance Anchor store. Local, sovereign, honest.
//
// Why this exists: the OTS calendar protocol cannot be polled from a
// browser in a verifiable way — the calendars do not serve CORS, and
// even if they did, the proof requires the .ots receipt bytes which
// don't live in this repo. Auto-promotion in the UI without those
// bytes would be THEATER.
//
// Instead, the operator records anchors locally after running
// `ots verify <file>.ots` on their own machine. Each anchor binds:
//   sha256_hex → { block_height, txid, anchored_at, source }
// and is persisted via the sovereign-store (localStorage + IDB mirror).
//
// The UI then promotes the matching receipt from PENDING → ANCHORED.

import { kvGet, kvSet } from "@/lib/sovereign-store";
import { KNOWN_ANCHORS, getKnownAnchor } from "@/data/known-anchors";

const KEY = "nexinus.ops.anchors.v1";

export type Anchor = {
  sha256: string;          // 64-char lowercase hex
  block_height: number;    // BTC block height that confirmed the calendar tx
  txid?: string;           // optional 64-char BTC txid
  anchored_at: number;     // local timestamp the operator recorded the proof
  source: "ots-verify" | "manual";
  note?: string;
};

type AnchorMap = Record<string, Anchor>;

function read(): AnchorMap {
  try {
    const raw = kvGet(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as AnchorMap) : {};
  } catch {
    return {};
  }
}

function write(map: AnchorMap): void {
  kvSet(KEY, JSON.stringify(map));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("nexinus:anchors"));
  }
}

export function listAnchors(): Anchor[] {
  const local = read();
  const merged: AnchorMap = {};
  // Known anchors form the public floor; local overrides only if operator
  // has recorded a more recent verification for the same sha.
  for (const sha of Object.keys(KNOWN_ANCHORS)) {
    const k = getKnownAnchor(sha);
    if (k) merged[sha] = k;
  }
  for (const [sha, a] of Object.entries(local)) merged[sha] = a;
  return Object.values(merged).sort((a, b) => b.anchored_at - a.anchored_at);
}

export function getAnchor(sha256: string): Anchor | undefined {
  const sha = sha256.toLowerCase();
  return read()[sha] ?? getKnownAnchor(sha);
}

export function recordAnchor(input: Omit<Anchor, "anchored_at" | "source"> & {
  source?: Anchor["source"];
  anchored_at?: number;
}): Anchor {
  const sha = input.sha256.toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(sha)) throw new Error("sha256 must be 64-char hex");
  if (!Number.isFinite(input.block_height) || input.block_height < 0) {
    throw new Error("block_height must be a non-negative integer");
  }
  if (input.txid && !/^[a-f0-9]{64}$/.test(input.txid.toLowerCase())) {
    throw new Error("txid must be 64-char hex");
  }
  const anchor: Anchor = {
    sha256: sha,
    block_height: Math.floor(input.block_height),
    txid: input.txid?.toLowerCase(),
    anchored_at: input.anchored_at ?? Date.now(),
    source: input.source ?? "manual",
    note: input.note,
  };
  const map = read();
  map[sha] = anchor;
  write(map);
  return anchor;
}

export function removeAnchor(sha256: string): void {
  const map = read();
  delete map[sha256.toLowerCase()];
  write(map);
}

export function subscribeAnchors(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const h = () => cb();
  window.addEventListener("nexinus:anchors", h);
  window.addEventListener("storage", h);
  return () => {
    window.removeEventListener("nexinus:anchors", h);
    window.removeEventListener("storage", h);
  };
}
