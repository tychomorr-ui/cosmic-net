// OMNI-SAM AXIS · 13 canonical blades.
// Each blade owns a unique route. Standby tiles are honest, not navigational fakes.

export type BladeStatus = "LIVE" | "STANDBY" | "AWAITING";

export type Blade = {
  n: string;          // "01" .. "13"
  glyph: string;      // single-char sigil
  name: string;
  route: string;      // canonical sovereign route
  status: BladeStatus;
  tagline: string;
  awaiting?: string;  // what would flip it to LIVE
};

export const BLADES: Blade[] = [
  { n: "01", glyph: "⊕", name: "Alpha Dashboard",   route: "/",                status: "LIVE",
    tagline: "kether gate console · the axis itself" },
  { n: "02", glyph: "⚒", name: "Sovereign Forge",   route: "/forge",           status: "STANDBY",
    tagline: "manifest composer · local-first build records",
    awaiting: "forge job emitter (browser-local; no remote required)" },
  { n: "03", glyph: "◉", name: "Reflective Intel",  route: "/reflective-intel",status: "LIVE",
    tagline: "per-blade telemetry mirror · ledger + probe store" },
  { n: "04", glyph: "✺", name: "Network NEBULA",    route: "/nebula",          status: "LIVE",
    tagline: "samm mist-flow · signed-relay sweep" },
  { n: "05", glyph: "✦", name: "Payment Nexus",     route: "/payment-nexus",   status: "STANDBY",
    tagline: "sovereign-node proxy · /api/saa/{stripe|paypal|chain|cashapp}",
    awaiting: "node-side SAA endpoints (secrets stay node-side)" },
  { n: "06", glyph: "⌖", name: "Investigation",     route: "/investigation",   status: "STANDBY",
    tagline: "evidence lockers · OODA-bound queries",
    awaiting: "first signed evidence packet" },
  { n: "07", glyph: "▣", name: "TERMINUS",          route: "/ops",             status: "LIVE",
    tagline: "ops ledger · live gateway probes" },
  { n: "08", glyph: "✧", name: "SAM Command",       route: "/sam-command",     status: "LIVE",
    tagline: "time-series command surface · archangel ticker window" },
  { n: "09", glyph: "♕", name: "PAM Monarch",       route: "/pam",             status: "LIVE",
    tagline: "lane discipline · CID-chained Truth Ledger" },
  { n: "10", glyph: "⛬", name: "Digital Ore",       route: "/digital-ore",     status: "LIVE",
    tagline: "intellectual byproduct ledger · FNV-1a truth mirror · local-only" },
  { n: "11", glyph: "◈", name: "Truth Substrate",    route: "/sudo-coin",       status: "LIVE",
    tagline: "truth-coin substrate · live BTC readout · pistifus-weighted" },
  { n: "12", glyph: "◬", name: "QUANTOTALUS",       route: "/quantotalus",     status: "STANDBY",
    tagline: "triadaxial spinner · Helsinki · Singapore · Falkenstein",
    awaiting: "vertex registration manifest" },
  { n: "13", glyph: "◇", name: "PROOF FULCRUM",     route: "/proof-fulcrum",   status: "STANDBY",
    tagline: "ed25519 fleet witness · operator stamp",
    awaiting: "first signed fleet receipt" },
];
