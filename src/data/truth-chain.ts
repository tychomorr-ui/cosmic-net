// Truth Chain ledger. The "chain" is the chronologically ordered set of
// node-signed status payloads + CIDv1 enrollment receipts held by this
// operator. There is no global ledger and no token — each link is a
// verifiable continuation of a node's operational truth.
//
// Persisted client-side in localStorage; the source of truth is the node
// itself (its ed25519 key, its signed /status response).

export type TruthChainLink = {
  id: string;            // slug
  label: string;         // human name
  region: string;
  endpoint: string;      // host:port for WireGuard
  statusUrl: string;     // https://.../status (CORS-readable signed JSON)
  edPubHex: string;      // node-resident ed25519 pubkey (status signer + handshake verifier)
  serverXPubBase64: string; // node WireGuard public key
  enrolledAt: number;    // genesis timestamp for this link
};

const STORAGE_KEY = "nexinus.terminus.truth-chain.v1";
const LEGACY_KEY = "nexinus.terminus.fleet.v1";

export function loadChain(): TruthChainLink[] {
  if (typeof window === "undefined") return [];
  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TruthChainLink[];
    if (window.localStorage.getItem(STORAGE_KEY) === null) {
      window.localStorage.setItem(STORAGE_KEY, raw);
    }
    return parsed;
  } catch {
    return [];
  }
}

export function saveChain(links: TruthChainLink[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
}

export function upsertLink(n: TruthChainLink): TruthChainLink[] {
  const all = loadChain();
  const next = [...all.filter((x) => x.id !== n.id), n].sort((a, b) =>
    a.label.localeCompare(b.label),
  );
  saveChain(next);
  return next;
}

export function removeLink(id: string): TruthChainLink[] {
  const next = loadChain().filter((x) => x.id !== id);
  saveChain(next);
  return next;
}
