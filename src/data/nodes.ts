export type Tier = "measured" | "attested" | "doctrine";

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
  probe?: {
    kind: "cors-json" | "no-cors-head" | "signed-status";
    url: string;
    okField?: string; // dot-path in JSON, defaults to "ok"
    edPubHex?: string; // expected ed25519 pubkey for signed-status probes
  };
};

export const NODES: SovereignNode[] = [
  {
    id: "tesseract-a",
    name: "Tesseract-A",
    provider: "Local sovereign hardware",
    region: "Operator-held",
    role: "Anchor terminal · ed25519 signing surface",
    tier: "attested",
    declared: "ATTESTED · UNVERIFIED",
    facts: [
      "Holds the operator key for fleet liveness stamps.",
      "Not directly reachable from the public web by design.",
    ],
    truth:
      "Tesseract-A is held in operator custody. Its existence is asserted by signed receipts surfaced elsewhere in the fleet, not by a public endpoint here.",
  },
  {
    id: "helsinki-vertex",
    name: "Helsinki Vertex",
    provider: "Doctrine placeholder",
    region: "Helsinki",
    role: "Topology vertex · Helsinki · Singapore · Falkenstein triangle",
    tier: "doctrine",
    declared: "DOCTRINE · INTENT",
    facts: [
      "Listed as a planned vertex of the triadaxial mist-mesh.",
      "No live endpoint has been claimed.",
    ],
    truth:
      "Helsinki Vertex describes a topology intent, not a running service. Promotion to ATTESTED requires a signed manifest; promotion to MEASURED requires a reachable health surface.",
  },
  {
    id: "xinus-lens",
    name: "XinUS-Lens",
    provider: "Sovereign cognition layer",
    region: "Browser-local",
    role: "Lens · sovereign reflection surface",
    tier: "doctrine",
    declared: "DOCTRINE · INTENT",
    facts: [
      "Reads signals from local instrumentation only.",
      "No remote callbacks, no third-party telemetry.",
    ],
    truth:
      "XinUS-Lens is a client-local reflection module. It cannot be probed externally because it has no network surface by intent.",
  },
  {
    id: "xinus-monarch",
    name: "Xinus-Monarch",
    provider: "xinus.one",
    region: "Public reachable host",
    role: "Telemetry-gated gateway · health surface",
    tier: "attested",
    declared: "ATTESTED · health probe in this card",
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
    role: "Registered relay · health pending",
    tier: "attested",
    declared: "ATTESTED · reachability probe in this card",
    facts: [
      "Registered in the fleet manifest as valkyrie.nexinus.net (5.78.148.244).",
      "Does not currently expose a CORS-readable health JSON.",
    ],
    truth:
      "Valkyrie is probed with an opaque HEAD request against valkyrie.nexinus.net. Opaque success means the origin answered; it does not prove application health, only that the host is reachable from the browser's network path.",
    probe: {
      kind: "no-cors-head",
      url: "https://valkyrie.nexinus.net/",
    },
  },
  {
    id: "terminus-tesseractus",
    name: "Terminus-Tesseractus",
    provider: "Operator console",
    region: "Browser-local",
    role: "Witness console shell",
    tier: "measured",
    declared: "MEASURED · this render",
    facts: [
      "If you are reading this card, the Terminus shell rendered successfully.",
      "Liveness equals page paint — no remote claim required.",
    ],
    truth:
      "The Terminus console is observable directly: its measurement is the act of rendering this page on your device right now.",
  },
  {
    id: "east-coast-relay",
    name: "East Coast Relay",
    provider: "Doctrine placeholder",
    region: "US-East (planned)",
    role: "Continental relay vertex",
    tier: "doctrine",
    declared: "DOCTRINE · INTENT",
    facts: [
      "Planned continental relay for the sovereign mist.",
      "No host, no endpoint, no signed manifest yet.",
    ],
    truth:
      "East Coast Relay is named in the topology vision. It is not a running service. Do not treat it as reachable.",
  },
  {
    id: "resonate-earth",
    name: "Resonate-Earth",
    provider: "resonate-earth.live",
    region: "Public reachable host",
    role: "Schumann-resonance witness · planetary substrate node",
    tier: "attested",
    declared: "ATTESTED · sovereign handshake · reachability probe in this card",
    facts: [
      "Sovereign witness surface for Earth's electromagnetic substrate.",
      "Reachability probed via opaque HEAD; sovereign handshake recorded in Truth Chain.",
      "First-class vertex of the substrate layer alongside Truth Substrate (◈).",
      "Bound to the 7D unity CID — any change here re-hashes the unification certificate.",
    ],
    truth:
      "Resonate-Earth couples the bitcoin substrate (work / pressure / density) to the planetary substrate (resonance / coherence). The sovereign handshake binds its origin into the Truth Chain heptagram; promotion to MEASURED requires a signed /status surface.",
    probe: {
      kind: "no-cors-head",
      url: "https://resonate-earth.live/",
    },
  },
];
