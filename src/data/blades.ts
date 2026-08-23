// OMNI-SAM AXIS · canonical blades.
// Only blades with a real surface are registered. Blades that were purged in
// the doctrine sweep are deleted outright — no AWAITING placeholders, no
// tiles that promise a function that does not exist.

export type BladeStatus = "LIVE" | "STANDBY";

export type Blade = {
  n: string;          // registry number (stable, not contiguous after purges)
  glyph: string;      // single-char sigil
  name: string;
  route: string;      // canonical sovereign route
  status: BladeStatus;
  tagline: string;
  blocker?: string;   // for STANDBY: the concrete signal that flips it to LIVE
};

export const BLADES: Blade[] = [
  { n: "01", glyph: "⊕", name: "Alpha Dashboard",   route: "/",                status: "LIVE",
    tagline: "kether gate console · the axis itself" },
  { n: "03", glyph: "◉", name: "Reflective Intel",  route: "/reflective-intel",status: "LIVE",
    tagline: "per-blade telemetry mirror · ledger + probe store" },
  { n: "04", glyph: "✺", name: "Network NEBULA",    route: "/nebula",          status: "LIVE",
    tagline: "samm mist-flow · signed-relay sweep" },
  { n: "07", glyph: "▣", name: "TERMINUS",          route: "/ops",             status: "LIVE",
    tagline: "ops ledger · live gateway probes" },
  { n: "08", glyph: "✧", name: "SAM Command",       route: "/sam-command",     status: "LIVE",
    tagline: "time-series command surface · archangel ticker window" },
  { n: "09", glyph: "♕", name: "PAM Monarch",       route: "/pam",             status: "LIVE",
    tagline: "lane discipline · CID-chained Truth Ledger" },
  { n: "10", glyph: "⛬", name: "Digital Ore",       route: "/digital-ore",     status: "LIVE",
    tagline: "intellectual byproduct ledger · FNV-1a truth mirror · local-only" },
  { n: "11", glyph: "◈", name: "Truth Substrate",   route: "/sudo-coin",       status: "LIVE",
    tagline: "truth-coin substrate · live BTC readout · pistifus-weighted" },
  { n: "12", glyph: "◬", name: "QUANTOTALUS",       route: "/quantotalus",     status: "STANDBY",
    tagline: "triadaxial spinner · Oregon · Ireland · Singapore",
    blocker: "vertex registration manifest" },
  { n: "13", glyph: "◇", name: "PROOF FULCRUM",     route: "/proof-fulcrum",   status: "STANDBY",
    tagline: "ed25519 fleet witness · operator stamp",
    blocker: "first signed fleet receipt" },
];

export const BLADE_COUNT = BLADES.length;
