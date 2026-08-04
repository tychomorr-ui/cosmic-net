// Federation peers — external systems that claim to interoperate with
// universaltruth.life. Nothing here is trusted. Each peer is probed live and
// reported at whatever state the probe actually returns.
//
// A peer is only "coupled" once it serves an ARCHANGEL/v0 signed payload whose
// re-derived CID matches. Until then it is, at best, REACHABLE.

export type PeerKind = "mirror" | "gateway" | "repo";

export type Peer = {
  id: string;
  label: string;
  kind: PeerKind;
  /** URL that is probed for reachability. */
  probeUrl: string;
  /** Human-facing link. */
  href: string;
  /** What the operator claims this peer does. Claim, not verified fact. */
  claim: string;
  /** What is still missing before this peer can be trusted. */
  blocker: string;
};

export const FEDERATION_PEERS: Peer[] = [
  {
    id: "tesseract-mirror",
    label: "TESSERACT",
    kind: "mirror",
    probeUrl: "https://tesseract.manus.space/",
    href: "https://tesseract.manus.space",
    claim:
      "Recovery frontend (12-step tracking, daily practices, sponsor matching).",
    blocker:
      "Externally hosted SPA. No signed /status payload, no verified Search Console property, robots.txt and sitemap.xml return the app shell.",
  },
  {
    id: "nexinus-gateway",
    label: "NEXINUS GATEWAY",
    kind: "gateway",
    probeUrl:
      "https://3001-iu3zb7515g6qp29sv2i0m-f87cf2f0.us2.manus.computer/health",
    href: "https://3001-iu3zb7515g6qp29sv2i0m-f87cf2f0.us2.manus.computer",
    claim:
      "14 endpoints with Ed25519-signed responses and bidirectional webhook sync.",
    blocker:
      "Published on an ephemeral sandbox host. Needs a stable domain with TLS and a pinned Ed25519 public key before any webhook can be accepted here.",
  },
  {
    id: "tesseract-repo",
    label: "TESSERACT SOURCE",
    kind: "repo",
    probeUrl: "https://api.github.com/repos/tychomorr-ui/tesseract",
    href: "https://github.com/tychomorr-ui/tesseract",
    claim: "Public source for the Tesseract frontend.",
    blocker:
      "Not publicly readable. Auditors cannot reproduce the deployed build from source.",
  },
];
