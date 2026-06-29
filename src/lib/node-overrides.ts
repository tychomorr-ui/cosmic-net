// Sovereign per-node probe overrides. Stored locally so the operator can
// promote a node to `signed-status` (with its real ed25519 pubkey + URL)
// without recompiling the bundle or shipping a key to the repo.
//
// Shape: { [nodeId]: { kind, url, edPubHex } }
// Persisted via the sovereign kv store (localStorage + IDB mirror).

import { kvGet, kvSet } from "@/lib/sovereign-store";

const KEY = "nexinus.nodes.overrides.v1";

export type NodeOverride = {
  kind: "signed-status";
  url: string;
  edPubHex: string; // 64-char hex (32 bytes)
  setAt: number;
};

type OverrideMap = Record<string, NodeOverride>;

function read(): OverrideMap {
  try {
    const raw = kvGet(KEY);
    if (!raw) return {};
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? (v as OverrideMap) : {};
  } catch {
    return {};
  }
}

function write(map: OverrideMap): void {
  kvSet(KEY, JSON.stringify(map));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("nexinus:node-overrides"));
  }
}

export function getOverride(nodeId: string): NodeOverride | undefined {
  return read()[nodeId];
}

export function listOverrides(): OverrideMap {
  return read();
}

export function setSignedOverride(
  nodeId: string,
  url: string,
  edPubHex: string,
): NodeOverride {
  const hex = edPubHex.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(hex)) {
    throw new Error("edPubHex must be 64-char hex (32 bytes ed25519)");
  }
  try {
    new URL(url);
  } catch {
    throw new Error("url must be absolute (https://host/path)");
  }
  const ov: NodeOverride = { kind: "signed-status", url: url.trim(), edPubHex: hex, setAt: Date.now() };
  const map = read();
  map[nodeId] = ov;
  write(map);
  return ov;
}

export function clearOverride(nodeId: string): void {
  const map = read();
  delete map[nodeId];
  write(map);
}

export function subscribeOverrides(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const h = () => cb();
  window.addEventListener("nexinus:node-overrides", h);
  window.addEventListener("storage", h);
  return () => {
    window.removeEventListener("nexinus:node-overrides", h);
    window.removeEventListener("storage", h);
  };
}
