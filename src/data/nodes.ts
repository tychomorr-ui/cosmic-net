export type Tier = "measured" | "attested" | "doctrine";

export type ClusterId = "alpha" | "beta";

export type Probe =
  | { kind: "cors-json"; url: string; okField?: string; ipfsFallback?: IpfsFallback }
  | { kind: "no-cors-head"; url: string; ipfsFallback?: IpfsFallback }
  | { kind: "signed-status"; url: string; edPubHex?: string; ipfsFallback?: IpfsFallback }
  | { kind: "ipfs-signed-status"; cid: string; edPubHex: string; gateways?: string[] };

export type IpfsFallback = {
  cid: string;
  edPubHex: string;
  gateways?: string[];
};

export type SovereignNode = {
  id: string;
  name: string;
  provider: string;
  region: string;
  role: string;
  tier: Tier;
  declared: string;
  facts: string[];
  truth: string;
  cluster_id?: ClusterId;
  cluster_role?: "anchor" | "vertex";
  probe?: Probe;
};

// Default public IPFS gateways used when a node's probe/fallback doesn't list its own.
export const DEFAULT_IPFS_GATEWAYS = [
  "https://cloudflare-ipfs.com/ipfs/",
  "https://ipfs.io/ipfs/",
  "https://dweb.link/ipfs/",
];

export const NODES: SovereignNode[] = [
  // ============ CLUSTER ALPHA ============
  {
    id: "xinus-monarch",
    name: "Xinus-Monarch",
    provider: "xinus.one",
    region: "Public reachable host",
    role: "Alpha anchor · HTTPS signed-status gateway",
    tier: "attested",
    declared: "ATTESTED · health probe in this card",
    cluster_id: "alpha",
    cluster_role: "anchor",
    facts: [
      "Exposes an ARCHANGEL/v0 signed status surface at monarch.xinus.one/health.",
      "Promotes to MEASURED · LIVE on signature verification against the operator pubkey.",
    ],
    truth:
      "Monarch is the one node a browser can directly verify. The card couples local CID derivation against the node's signed /health payload, verified with the published ed25519 pubkey.",
    probe: {
      kind: "signed-status",
      url: "https://monarch.xinus.one/health",
      edPubHex: "39436f5ab3af4b2e9db4dc0ea3a9cff9060f0167d8537174e5cc332a722b12c4",
    },
  },
  {
    id: "xinus-valkyrie",
    name: "Valkyrie",
    provider: "nexinus.net",
    region: "5.78.148.244",
    role: "Alpha vertex · registered relay",
    tier: "attested",
    declared: "ATTESTED · reachability probe in this card",
    cluster_id: "alpha",
    cluster_role: "vertex",
    facts: [
      "Registered in the fleet manifest as valkyrie.nexinus.net (5.78.148.244).",
      "Does not currently expose a CORS-readable health JSON.",
    ],
    truth:
      "Valkyrie is probed with an opaque HEAD request against valkyrie.nexinus.net. Opaque success means the origin answered; it does not prove application health, only that the host is reachable from the browser's network path.",
    probe: {
      kind: "signed-status",
      url: "https://valkyrie.nexinus.net/health",
      edPubHex: "a61910dffc0bf0e052019af2ed1db68c411131455bd03d789d1424189be0e15f",
    },
  },
  {
    id: "helsinki-vertex",
    name: "Helsinki Vertex",
    provider: "Doctrine placeholder",
    region: "Helsinki",
    role: "Alpha vertex · IPFS-gated (pending CID)",
    tier: "doctrine",
    declared: "DOCTRINE · awaiting IPFS pin",
    cluster_id: "alpha",
    cluster_role: "vertex",
    facts: [
      "Reserved vertex for the Alpha triangle.",
      "Activates when an operator pins a signed status JSON to IPFS and its CID is written into this manifest.",
    ],
    truth:
      "Helsinki Vertex describes a topology intent. Promotion to LIVE requires a real IPFS CID resolving to an ARCHANGEL/v0 signed envelope; no probe runs until then.",
  },

  // ============ CLUSTER BETA ============
  {
    id: "resonate-earth",
    name: "Resonate-Earth",
    provider: "resonate-earth.live",
    region: "Public reachable host",
    role: "Beta anchor · Schumann-resonance witness",
    tier: "attested",
    declared: "ATTESTED · IPFS-gated resolution",
    cluster_id: "beta",
    cluster_role: "anchor",
    facts: [
      "Sovereign witness surface for Earth's electromagnetic substrate.",
      "Configured to resolve its signed status via IPFS content-addressed payload rather than a REST /health.",
      "Falls back to opaque HEAD only if IPFS resolution fails.",
      "Bound to the 7D unity CID — any change here re-hashes the unification certificate.",
    ],
    truth:
      "Resonate-Earth couples the bitcoin substrate (work / pressure / density) to the planetary substrate (resonance / coherence). Its signed status envelope is expected to live at a pinned IPFS CID; the browser resolves through public gateways with signature verification against the node pubkey.",
    probe: {
      kind: "no-cors-head",
      url: "https://resonate-earth.live/",
      // Once operator pins the signed envelope to IPFS, set cid+edPubHex here to promote to LIVE.
      // ipfsFallback: { cid: "bafy…", edPubHex: "…" },
    },
  },
  {
    id: "tesseract-a",
    name: "Tesseract-A",
    provider: "Local sovereign hardware",
    region: "Operator-held",
    role: "Beta vertex · ed25519 signing surface",
    tier: "attested",
    declared: "ATTESTED · UNVERIFIED",
    cluster_id: "beta",
    cluster_role: "vertex",
    facts: [
      "Holds the operator key for fleet liveness stamps.",
      "Not directly reachable from the public web by design; participates via signed receipts.",
    ],
    truth:
      "Tesseract-A is held in operator custody. Its existence is asserted by signed receipts surfaced elsewhere in the fleet, not by a public endpoint here.",
  },
  {
    id: "beta-ipfs-vertex",
    name: "Beta IPFS Vertex",
    provider: "IPFS-native",
    region: "Content-addressed",
    role: "Beta vertex · IPFS-gated (pending CID)",
    tier: "doctrine",
    declared: "DOCTRINE · awaiting IPFS pin",
    cluster_id: "beta",
    cluster_role: "vertex",
    facts: [
      "Reserved vertex for the Beta triangle.",
      "Activates once a signed-status JSON is pinned; the browser will resolve it via IPFS gateway.",
    ],
    truth:
      "Beta IPFS Vertex has no HTTPS surface by design. Its liveness depends entirely on a content-addressed signed envelope; no CID pinned means no probe attempted.",
  },
];

/** Human-readable target for a probe (URL or ipfs://CID). */
export function probeTarget(p: Probe | undefined | null): string {
  if (!p) return "";
  if (p.kind === "ipfs-signed-status") return `ipfs://${p.cid}`;
  return p.url;
}
