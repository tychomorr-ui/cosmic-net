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
  /** Operator-held host (IPv4). Probed server-side for real reachability. */
  host?: string;
  ipv6?: string;
  /** Declared machine size, as reported by the hosting console. */
  spec?: string;
};

// Default public IPFS gateways used when a node's probe/fallback doesn't list its own.
export const DEFAULT_IPFS_GATEWAYS = [
  "https://cloudflare-ipfs.com/ipfs/",
  "https://ipfs.io/ipfs/",
  "https://dweb.link/ipfs/",
];

// Real operator-owned fleet (AWS Lightsail, five running instances) plus the
// Resonate-Earth witness. Reachability is measured server-side against the
// host addresses below; LIVE still requires an ARCHANGEL/v0 signed status.
export const NODES: SovereignNode[] = [
  // ============ CLUSTER ALPHA ============
  {
    id: "root-gate",
    name: "Root-Gate",
    provider: "AWS Lightsail",
    region: "Oregon (us-west-2) · Zone A",
    role: "Alpha anchor · sovereign control plane",
    tier: "attested",
    declared: "ATTESTED · host reachability measured server-side",
    cluster_id: "alpha",
    cluster_role: "anchor",
    host: "34.223.165.42",
    ipv6: "2600:1f14:159c:7600:39e5:ec3d:dc2d:b7c9",
    spec: "16 GB RAM · 4 vCPU · 320 GB SSD",
    facts: [
      "Running instance in Oregon, Zone A, owned outright by the operator.",
      "Largest node in the fleet; intended host for the control plane and the signed-status daemon.",
    ],
    truth:
      "Root-Gate is real hardware the operator controls, and its reachability is probed from the server every 60 seconds. It is not LIVE until it serves an ARCHANGEL/v0 signed /status whose payload CID re-derives locally.",
  },
  {
    id: "tesseract-terminus",
    name: "Tesseract-Terminus",
    provider: "AWS Lightsail",
    region: "Oregon (us-west-2) · Zone A",
    role: "Alpha vertex · application terminus",
    tier: "attested",
    declared: "ATTESTED · host reachability measured server-side",
    cluster_id: "alpha",
    cluster_role: "vertex",
    host: "34.216.185.65",
    ipv6: "2600:1f14:159c:7600:f0a5:5158:452a:5860",
    spec: "8 GB RAM · 2 vCPU · 160 GB SSD",
    facts: [
      "Running instance in Oregon, Zone A.",
      "Target of scripts/deploy-lightsail.sh — self-hosted SSR build behind Caddy TLS.",
    ],
    truth:
      "Terminus is the self-host target for this application. Reachability is measured; coupling requires the signed-status surface on the same host.",
  },
  {
    id: "xinus-clarity",
    name: "XinUS-Clarity",
    provider: "AWS Lightsail",
    region: "Ireland (eu-west-1) · Zone A",
    role: "Alpha vertex · European compute",
    tier: "attested",
    declared: "ATTESTED · host reachability measured server-side",
    cluster_id: "alpha",
    cluster_role: "vertex",
    host: "52.214.4.184",
    ipv6: "2a05:d018:1aa0:a900:af85:774d:c29f:79ac",
    spec: "8 GB RAM · 4 vCPU · 320 GB SSD · compute-optimized",
    facts: [
      "Running compute-optimized instance in Ireland, Zone A.",
      "Provides EU-side jurisdictional separation from the Oregon pair.",
    ],
    truth:
      "Clarity is a running operator-owned host in the EU. Its reachability is measured server-side; nothing about workload health is claimed until it signs a status payload.",
  },

  // ============ CLUSTER BETA ============
  {
    id: "kether-gate",
    name: "Kether-Gate",
    provider: "AWS Lightsail",
    region: "Singapore (ap-southeast-1) · Zone A",
    role: "Beta anchor · APAC gateway",
    tier: "attested",
    declared: "ATTESTED · host reachability measured server-side",
    cluster_id: "beta",
    cluster_role: "anchor",
    host: "18.138.160.99",
    ipv6: "2406:da18:5e4:a500:81a9:1562:c58f:fb29",
    spec: "8 GB RAM · 2 vCPU · 160 GB SSD",
    facts: [
      "Running instance in Singapore, Zone A.",
      "Carries the KetherGate registry role for the APAC path.",
    ],
    truth:
      "Kether-Gate is a real running host in Singapore. Reachability is measured from the server; gateway function is asserted by the operator and is not verified here until it signs a status payload.",
  },
  {
    id: "tesseract-a",
    name: "Tesseract-A",
    provider: "AWS Lightsail",
    region: "Frankfurt (eu-central-1) · Zone A",
    role: "Beta vertex · ed25519 signing surface",
    tier: "attested",
    declared: "ATTESTED · host reachability measured server-side",
    cluster_id: "beta",
    cluster_role: "vertex",
    host: "35.156.127.49",
    ipv6: "2a05:d014:a47:d800:e206:ee7b:aca6:2932",
    spec: "8 GB RAM · 2 vCPU · 160 GB SSD",
    facts: [
      "Running instance in Frankfurt, Zone A.",
      "Holds the operator key intended for fleet liveness stamps.",
    ],
    truth:
      "Tesseract-A is a running Lightsail host in Frankfurt. Its reachability is measured; the signing role is an operator claim until a signed receipt verifies against the published pubkey.",
  },
  {
    id: "resonate-earth",
    name: "Resonate-Earth",
    provider: "resonate-earth.live",
    region: "Public reachable host",
    role: "Beta vertex · Schumann-resonance witness",
    tier: "attested",
    declared: "ATTESTED · HTTPS reachability",
    cluster_id: "beta",
    cluster_role: "vertex",
    facts: [
      "Sovereign witness surface for Earth's electromagnetic substrate.",
      "No signed /status yet; probed by opaque HEAD only.",
      "Bound to the 7D unity CID — any change here re-hashes the unification certificate.",
    ],
    truth:
      "Resonate-Earth couples the bitcoin substrate (work / pressure / density) to the planetary substrate (resonance / coherence). It answers over HTTPS, which is reachability — not coupling.",
    probe: {
      kind: "no-cors-head",
      url: "https://resonate-earth.live/",
    },
  },
];

/** Human-readable target for a probe (URL or ipfs://CID). */
export function probeTarget(p: Probe | undefined | null): string {
  if (!p) return "";
  if (p.kind === "ipfs-signed-status") return `ipfs://${p.cid}`;
  return p.url;
}
