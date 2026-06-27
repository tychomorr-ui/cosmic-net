// Fleet roster. Operator pastes the node's first-boot ed25519 pubkey + WG
// pubkey + endpoint into the /gateway form. Until then nodes are PENDING.
// Persisted client-side in localStorage; the source of truth is the node itself.

export type FleetNode = {
  id: string;            // slug
  label: string;         // human name
  region: string;
  endpoint: string;      // host:port for WireGuard
  statusUrl: string;     // https://.../status (CORS-readable signed JSON)
  edPubHex: string;      // node-resident ed25519 pubkey (status signer + handshake verifier)
  serverXPubBase64: string; // node WireGuard public key
  enrolledAt: number;
};

const STORAGE_KEY = "nexinus.terminus.fleet.v1";

export function loadFleet(): FleetNode[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FleetNode[]) : [];
  } catch {
    return [];
  }
}

export function saveFleet(nodes: FleetNode[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nodes));
}

export function upsertFleetNode(n: FleetNode): FleetNode[] {
  const all = loadFleet();
  const next = [...all.filter((x) => x.id !== n.id), n].sort((a, b) => a.label.localeCompare(b.label));
  saveFleet(next);
  return next;
}

export function removeFleetNode(id: string): FleetNode[] {
  const next = loadFleet().filter((x) => x.id !== id);
  saveFleet(next);
  return next;
}
