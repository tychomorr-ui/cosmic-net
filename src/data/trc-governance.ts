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

/** True only when a real Safe address has been recorded. */
export const safeConfigured = (): boolean => TRC_SAFE.address !== "" && TRC_SAFE.threshold > 0;

/** True only when a real third-party audit has been recorded. */
export const auditConfigured = (): boolean =>
  TRC_AUDIT.firm !== "" && TRC_AUDIT.reportUrl !== "" && TRC_AUDIT.reportSha256 !== "";

/**
 * Mainnet is gated on BOTH being real. This function is the single source of
 * truth for "may a mainnet address be pinned?" — it can never return true on
 * placeholder data.
 */
export const mainnetGateOpen = (): boolean => safeConfigured() && auditConfigured();

/** Human-readable reasons the gate is closed. Empty array === gate open. */
export function mainnetBlockers(): string[] {
  const out: string[] = [];
  if (!safeConfigured()) out.push("Safe multisig on Base not created / not recorded");
  if (!auditConfigured()) out.push("Independent third-party audit not commissioned / not recorded");
  return out;
}
