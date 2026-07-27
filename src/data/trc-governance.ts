// TRC governance / ownership config.
//
// DOCTRINE: nothing in this file may be filled with a guessed, example, or
// "representative" value. Every field stays empty until the operator pastes a
// real, verifiable value. Empty === the UI renders AWAITING, never a claim.

export type SafeConfig = {
  /** Safe (multisig) address on Base. Empty until the Safe actually exists. */
  address: `0x${string}` | "";
  /** Chain the Safe lives on. 8453 = Base mainnet. */
  chainId: number;
  chainName: string;
  /** Signer addresses. Empty array until recorded from the deployed Safe. */
  signers: `0x${string}`[];
  /** Confirmations required. 0 until read from the deployed Safe. */
  threshold: number;
  /** ISO date the Safe was created, per its deployment tx. */
  createdAt: string;
  /** Safe deployment tx hash — the evidence for everything above. */
  deployTx: `0x${string}` | "";
};

export const TRC_SAFE: SafeConfig = {
  address: "",
  chainId: 8453,
  chainName: "Base",
  signers: [],
  threshold: 0,
  createdAt: "",
  deployTx: "",
};

export type AuditRecord = {
  /** Name of the independent firm. Self-review does not count. */
  firm: string;
  /** ISO date the report was published. */
  reportDate: string;
  /** Public URL of the report. */
  reportUrl: string;
  /** SHA-256 of the report PDF, so the published report can be pinned. */
  reportSha256: string;
  /** Commit / file SHA of the exact TruthCoin.sol that was audited. */
  auditedSourceSha256: string;
  /** Findings resolved, and the commit that resolved them. */
  remediation: string;
};

export const TRC_AUDIT: AuditRecord = {
  firm: "",
  reportDate: "",
  reportUrl: "",
  reportSha256: "",
  auditedSourceSha256: "",
  remediation: "",
};

export type TimelockConfig = {
  /** Declared delay, in seconds, between queueing and executing an admin action. */
  delaySeconds: number;
  /**
   * What actually enforces the delay on-chain: a timelock contract address, or
   * a deployed Safe module. Empty === the delay is DECLARED, NOT ENFORCED.
   * A declared-only delay is an intention, not a protection, and the UI must
   * say so rather than implying the guard exists.
   */
  enforcedBy: `0x${string}` | "";
  /** Deployment tx of the enforcing contract/module — the evidence. */
  deployTx: `0x${string}` | "";
  /** Actions the delay covers, once enforced. */
  scope: string[];
};

export const TRC_TIMELOCK: TimelockConfig = {
  delaySeconds: 48 * 60 * 60, // 48h — see POLICY-OF-INTENT.md §5
  enforcedBy: "",
  deployTx: "",
  scope: ["transferOwnership", "acceptOwnership", "enableTransfers", "issueDignityCredit"],
};

/** True only when a real Safe address has been recorded. */
export const safeConfigured = (): boolean => TRC_SAFE.address !== "" && TRC_SAFE.threshold > 0;

/** True only when a real third-party audit has been recorded. */
export const auditConfigured = (): boolean =>
  TRC_AUDIT.firm !== "" && TRC_AUDIT.reportUrl !== "" && TRC_AUDIT.reportSha256 !== "";

/** True only when the delay is enforced by deployed code, not merely declared. */
export const timelockEnforced = (): boolean =>
  TRC_TIMELOCK.enforcedBy !== "" && TRC_TIMELOCK.delaySeconds > 0;

/**
 * Mainnet is gated on all three being real. This function is the single source
 * of truth for "may a mainnet address be pinned?" — it can never return true on
 * placeholder data.
 */
export const mainnetGateOpen = (): boolean =>
  safeConfigured() && auditConfigured() && timelockEnforced();

/** Human-readable reasons the gate is closed. Empty array === gate open. */
export function mainnetBlockers(): string[] {
  const out: string[] = [];
  if (!safeConfigured()) out.push("Safe multisig on Base not created / not recorded");
  if (!auditConfigured()) out.push("Independent third-party audit not commissioned / not recorded");
  if (!timelockEnforced()) {
    out.push("Admin time-lock declared (48h) but not enforced by deployed code");
  }
  return out;
}

