// PAM · SOURCE&TRUTH lane discipline helpers.
//
// Lanes run in fixed order. EMERGENCY short-circuits.
// Each non-emergency response must surface a reflection and collapse to
// exactly one concrete next move.

import type { Lane, LedgerTruth } from "@/data/truth-ledger";

export const LANE_ORDER: Lane[] = [
  "Core",
  "Expand",
  "Ascend",
  "Transcend",
  "Warrior",
  "Omni",
];

export const LANE_GLOSS: Record<Lane, string> = {
  Core: "ground state · intent + scope",
  Expand: "decomposition · buildable pieces",
  Ascend: "synthesis · structural fit",
  Transcend: "doctrine · operator vocabulary check",
  Warrior: "execution · constraint + risk",
  Omni: "integration · ledger commit",
  EMERGENCY: "override · sovereignty > adaptation",
};

export function mirror(request: string, truths: LedgerTruth[]): string {
  const r = request.trim().replace(/\s+/g, " ");
  if (!r) return "";
  const ref = truths.length
    ? truths.map((t) => t.id).join(", ")
    : "unledgered";
  const head = r.length > 140 ? `${r.slice(0, 137)}…` : r;
  return `[${ref}] ${head}`;
}

export function detectDrift(
  request: string,
  truths: LedgerTruth[],
): string | null {
  const lower = request.toLowerCase();
  for (const t of truths) {
    // Naive conflict heuristic: explicit negation of a declared truth keyword.
    const tokens = t.statement
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 4);
    for (const tok of tokens) {
      if (
        lower.includes(`not ${tok}`) ||
        lower.includes(`no ${tok}`) ||
        lower.includes(`stop ${tok}`)
      ) {
        return `request negates truth ${t.id} (${tok})`;
      }
    }
  }
  return null;
}
