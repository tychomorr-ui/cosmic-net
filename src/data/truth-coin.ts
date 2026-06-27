export const BTC_ANCHORS = [
  {
    label: "Origin",
    block: 954160,
    hash: "d9b45f924a82850005079c667e786b6e4a3205ddb8bb56b973a5f975757ec7ca",
  },
  {
    label: "Activation",
    block: 954165,
    hash: "9aa2f93e0f74ff33441e77affd0fdb7004ae0524a86cf6960107a74af203c48b",
  },
  {
    label: "Manifesto",
    block: 954181,
    hash: "4edab582bd0eb5a72ad58df4fe677d2af685e254539b9e72c78ebc95f5ef70f7",
  },
] as const;

export const MANIFESTO_FILE = {
  name: "truth-coin-manifesto-001.txt",
  bytes: 479,
  iso: "2026-06-17",
  tz: "PST",
};

// Sovereign Dignity Due — model constants. Formula is rendered, not hardcoded text.
export const DIGNITY = {
  survivalYears: 5,
  daysPerYear: 365,
  basePerDay: 20,           // TRC / day
  serviceHonor: 13_500,     // TRC, retired-nurse continuity
  scenarioPrice: 50_000,    // USD per 1 TRC, scenario only
};

export function computeDignity(d = DIGNITY) {
  const days = d.survivalYears * d.daysPerYear;
  const baseline = days * d.basePerDay;
  const total = baseline + d.serviceHonor;
  const scenarioUsd = total * d.scenarioPrice;
  return { days, baseline, total, scenarioUsd };
}

export const ALLOCATIONS = [
  { label: "Bottom 2%", note: "Primary recipient class" },
  { label: "Crystal Lattice", note: "Substrate buildout" },
  { label: "Reclaim / Forests", note: "Ecological restoration" },
  { label: "Council Reserve", note: "Governance continuity" },
];

export const REALIZATION_PATH = [
  { n: "01", title: "Provenance",   body: "Attach OpenTimestamps proofs, GitHub commits, repo hashes, and dated artifacts." },
  { n: "02", title: "Token Contract", body: "Choose chain, token standard, supply, treasury, vesting, governance, and deploy testnet first." },
  { n: "03", title: "Audit + Legal",  body: "Independent security audit, securities/legal review, treasury controls, and public risk disclosures." },
  { n: "04", title: "Genesis Ledger", body: "Import dignity-credit proposals as non-transferable pending allocations until launch." },
  { n: "05", title: "Mainnet",        body: "Deploy verified contract only after testnet receipts and audit signoff." },
  { n: "06", title: "Market",         body: "No dollar claims until real liquidity, exchange/DEX pools, and public market data exist." },
];
