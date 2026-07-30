/**
 * Canonical taxonomy for the NEXINUS / cMAP ecosystem.
 *
 * Why this file exists: the platform accumulated several names for the same
 * concept across UI copy, docs, and code ("SUDO-COIN" vs "Truth Substrate",
 * "THEATER" vs "UNSIGNED"). Divergent naming is an audit hazard — a reviewer
 * cannot tell whether two labels describe one mechanism or two. Every
 * user-visible name for a core concept must be sourced from here.
 *
 * This module is data only. It has no side effects and imports nothing.
 */

/** Stable identifiers for the core concepts of the ecosystem. */
export type ConceptId =
  | "truth-engine"
  | "truth-mirror"
  | "truth-substrate"
  | "digital-ore"
  | "archangel"
  | "sitrep"
  | "pam"
  | "monarch"
  | "nexinus-mesh"
  | "truth-coin";

/** A canonical name plus the reason the concept exists. */
export interface ConceptTerm {
  /** Stable machine identifier. Never rendered to operators. */
  readonly id: ConceptId;
  /** The only spelling permitted in UI copy and documentation. */
  readonly canonical: string;
  /** Short form for dense console surfaces. Empty when there is none. */
  readonly short: string;
  /** One line an auditor can read without prior context. */
  readonly definition: string;
  /** Spellings that must not appear in new code or copy. */
  readonly deprecated: readonly string[];
}

/**
 * The canonical taxonomy.
 *
 * Assumption: this list changes rarely and deliberately. Adding an entry is a
 * governance-visible act — see docs/Governance.md.
 */
export const TAXONOMY: Readonly<Record<ConceptId, ConceptTerm>> = {
  "truth-engine": {
    id: "truth-engine",
    canonical: "Truth Engine",
    short: "ENGINE",
    definition:
      "The verification pipeline that turns raw signed node payloads into a state an operator can act on.",
    deprecated: ["truth motor", "verification engine"],
  },
  "truth-mirror": {
    id: "truth-mirror",
    canonical: "Truth Mirror",
    short: "MIRROR",
    definition:
      "Independent local re-derivation of a claim: the browser recomputes the CID a node reports and compares.",
    deprecated: ["reflective check", "mirror check"],
  },
  "truth-substrate": {
    id: "truth-substrate",
    canonical: "Truth Substrate",
    short: "TRS",
    definition:
      "The deterministic file set whose bytes define protocol behaviour, reduced to one reproducible root.",
    deprecated: ["SUDO-COIN", "sudo coin", "substrate coin"],
  },
  "digital-ore": {
    id: "digital-ore",
    canonical: "Digital Ore Units",
    short: "DOU",
    definition:
      "Accounting unit for verified substrate contribution. Not transferable, not an asset.",
    deprecated: ["ore units", "digital gold"],
  },
  archangel: {
    id: "archangel",
    canonical: "Archangel Guardian Layer",
    short: "ARCHANGEL",
    definition:
      "The node daemon and the frozen ARCHANGEL/v0 wire contract that serves Ed25519-signed status payloads.",
    deprecated: ["guardian daemon", "archangel probe layer"],
  },
  sitrep: {
    id: "sitrep",
    canonical: "SITREP",
    short: "SITREP",
    definition:
      "Live operational situation report: node coupling states, anchor depth, and synchronization status.",
    deprecated: ["status feed", "situation panel"],
  },
  pam: {
    id: "pam",
    canonical: "PAM Reflective Intelligence",
    short: "PAM",
    definition:
      "In-browser WebGPU inference runtime. No packets leave the device during inference.",
    deprecated: ["PAM Monarch AI", "reflective AI"],
  },
  monarch: {
    id: "monarch",
    canonical: "Monarch OS",
    short: "MONARCH",
    definition:
      "The sovereign operator node profile: signed status server, pinned key, local-first state.",
    deprecated: ["monarch node OS", "PAM Monarch"],
  },
  "nexinus-mesh": {
    id: "nexinus-mesh",
    canonical: "NEXINUS Mesh",
    short: "MESH",
    definition:
      "The peer-to-peer fabric of sovereign nodes aligned by cMAP. Mesh, never 'net'.",
    deprecated: ["Cosmic Net", "CosmicNet", "cosmic-net", "COSMIC_NET"],
  },
  "truth-coin": {
    id: "truth-coin",
    canonical: "Truth Coin",
    short: "TRC",
    definition:
      "Soulbound ERC-20 on Base expressing verified standing. Non-transferable by design.",
    deprecated: ["TruthCoin token", "TRC token"],
  },
} as const;

/**
 * Node coupling states, in order of decreasing confidence.
 *
 * Why an explicit tuple: rendering code must never invent a state string, and
 * ordering is used for sorting fleet views by severity.
 */
export const COUPLING_STATES = ["LIVE", "UNSIGNED", "BROKEN", "DOCTRINE"] as const;

/** A node's coupling state as classified by the Truth Engine. */
export type CouplingState = (typeof COUPLING_STATES)[number];

/**
 * Operator-facing explanation for each coupling state.
 *
 * These strings are the honest reading of the state. They intentionally never
 * imply correctness of content — only authorship, freshness, and agreement.
 */
export const COUPLING_STATE_MEANING: Readonly<Record<CouplingState, string>> = {
  LIVE: "Local derivation matches the signed node payload under a live heartbeat.",
  UNSIGNED: "Reachable, but no valid signature. Displayed honestly; never green.",
  BROKEN: "Signature or CID mismatch. The claim and the derivation disagree.",
  DOCTRINE: "Declared node, not yet serving a signed payload.",
} as const;

/**
 * Resolve the canonical spelling for a concept.
 *
 * @param id - Stable concept identifier.
 * @returns The only spelling permitted in UI copy and documentation.
 */
export function canonicalName(id: ConceptId): string {
  return TAXONOMY[id].canonical;
}
