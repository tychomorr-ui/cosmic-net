// Pass 5a — Extraction-Vector Audit.
//
// Programmatically projects the Centralization Inventory onto the three
// Sovereign Reclaim tenets. No network, no I/O — pure derivation so the
// dashboard reflects code, not claims.

import {
  CENTRALIZATION_INVENTORY,
  type Centralized,
} from "./centralization-inventory";

export type TenetVerdict = "pass" | "warn" | "fail";

export type ExtractionRow = {
  id: string;
  host: string;
  category: Centralized["category"];
  removable: Centralized["removable"];
  // Three tenets.
  portability: TenetVerdict;     // Can the user walk away with their data?
  rentSeeking: TenetVerdict;     // Is there a middleman extracting value?
  truthUtility: TenetVerdict;    // Is the artifact locally verifiable?
  rationale: {
    portability: string;
    rentSeeking: string;
    truthUtility: string;
  };
};

function judge(d: Centralized): ExtractionRow {
  // Portability: user data must be local & exportable.
  let portability: TenetVerdict = "pass";
  let portReason = "No user data leaves the browser.";
  if (d.category === "analytics") {
    portability = d.removable === "yes" ? "warn" : "fail";
    portReason =
      d.removable === "yes"
        ? "User events ingested to vendor; removable by toggle, but the historical log on the vendor side is not portable."
        : "User events captured by third-party with no local export path.";
  } else if (d.category === "host") {
    portability = "warn";
    portReason = "Static artifact; portable if rebuilt and re-pinned by the operator.";
  } else if (d.category === "fonts") {
    portability = "warn";
    portReason = "Asset fetched from CDN; portability requires self-hosting.";
  }

  // Rent-seeking: any managed middleman charging or gating access.
  let rentSeeking: TenetVerdict = "pass";
  let rentReason = "Operator-run; no managed intermediary in the path.";
  if (d.category === "analytics") {
    rentSeeking = "fail";
    rentReason = "Commercial SaaS in the data path.";
  } else if (d.category === "fonts") {
    rentSeeking = "warn";
    rentReason = "Free CDN, but a third party still gates delivery and sees the request.";
  } else if (d.category === "host") {
    rentSeeking = "warn";
    rentReason = "Managed edge host today; removable to IPFS/self-host.";
  }

  // Truth-utility: can a stranger verify the artifact locally?
  let truthUtility: TenetVerdict = "warn";
  let truthReason = "Reach is observable but body is not signed.";
  if (d.category === "probe") {
    if (d.id === "monarch") {
      truthUtility = "pass";
      truthReason = "Signed JSON probe — verifiable locally by the browser.";
    } else if (d.id === "valkyrie" || d.id === "resonate-earth") {
      truthUtility = "warn";
      truthReason = "Opaque HEAD only; reach is honest but body is not attested.";
    }
  } else if (d.category === "analytics" || d.category === "fonts" || d.category === "host") {
    truthUtility = "fail";
    truthReason = "No content-addressed receipt for the artifact served.";
  }

  return {
    id: d.id,
    host: d.host,
    category: d.category,
    removable: d.removable,
    portability,
    rentSeeking,
    truthUtility,
    rationale: {
      portability: portReason,
      rentSeeking: rentReason,
      truthUtility: truthReason,
    },
  };
}

export const EXTRACTION_AUDIT: ExtractionRow[] =
  CENTRALIZATION_INVENTORY.map(judge);

export type TenetTally = Record<TenetVerdict, number>;

export function tallyTenet(
  key: "portability" | "rentSeeking" | "truthUtility",
): TenetTally {
  const t: TenetTally = { pass: 0, warn: 0, fail: 0 };
  for (const r of EXTRACTION_AUDIT) t[r[key]]++;
  return t;
}

export function overallScore(): { pass: number; warn: number; fail: number; total: number } {
  const total = EXTRACTION_AUDIT.length * 3;
  let pass = 0, warn = 0, fail = 0;
  for (const r of EXTRACTION_AUDIT) {
    for (const k of ["portability", "rentSeeking", "truthUtility"] as const) {
      if (r[k] === "pass") pass++;
      else if (r[k] === "warn") warn++;
      else fail++;
    }
  }
  return { pass, warn, fail, total };
}
