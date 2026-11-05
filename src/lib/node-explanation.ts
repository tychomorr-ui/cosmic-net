import { z } from "zod";
import type { ProbeStatus } from "./probes";

export const evidenceSchema = z.object({
  nodeId: z.string().min(1).max(80),
  at: z.number().finite().nonnegative(),
  code: z.enum(["http", "network", "timeout", "signature", "cid", "stale", "unsigned", "other"]),
  httpStatus: z.number().int().min(100).max(599).optional(),
}).strict();
export type FailureEvidence = z.infer<typeof evidenceSchema>;

// Project only bounded facts; never send URLs, keys, response bodies or raw errors to AI.
export function failureEvidence(nodeId: string, status: ProbeStatus): FailureEvidence | null {
  if (status.state !== "unreachable" && status.state !== "reachable") return null;
  const detail = status.detail.toLowerCase();
  const http = /^http (\d{3})$/i.exec(status.detail);
  const code = http ? "http" : /cid|hash/.test(detail) ? "cid"
    : /signature invalid|signature mismatch|pub malformed|pub mismatch|pubkey|public key|key mismatch/.test(detail) ? "signature"
    : /stale|expired|ts in future/.test(detail) ? "stale"
    : /abort|timeout|timed out/.test(detail) ? "timeout"
    : /fetch|network/.test(detail) ? "network"
    : status.state === "reachable" ? "unsigned" : "other";
  return evidenceSchema.parse({ nodeId, at: status.at, code, ...(http ? { httpStatus: Number(http[1]) } : {}) });
}

export function explanationChoices(evidence: FailureEvidence): string[] {
  switch (evidence.code) {
    case "http": return [`The probe recorded HTTP ${evidence.httpStatus}; this check did not verify the node.`, `HTTP ${evidence.httpStatus} was recorded. This response does not establish verified health.`];
    case "network": return ["The probe recorded a network/fetch error; its cause is not established.", "The recorded fetch failed. This evidence cannot distinguish network, browser-policy, or origin problems."];
    case "timeout": return ["The probe recorded a timeout or aborted request; verified health was not obtained."];
    case "signature": return ["The recorded verification check failed on signing-key or signature evidence; the node remains unverified."];
    case "cid": return ["The recorded content/hash check did not match; this result does not verify the node."];
    case "stale": return ["The probe recorded a freshness failure; this result cannot establish current verified health."];
    case "unsigned": return ["The origin answered, but the recorded result does not establish cryptographically verified health."];
    default: return ["The recorded check failed; the available evidence does not establish a more specific cause."];
  }
}

export function selectExplanation(evidence: FailureEvidence, index: number): string {
  const choices = explanationChoices(evidence);
  if (!Number.isInteger(index) || index < 0 || index >= choices.length) throw new Error("Invalid AI selection");
  return choices[index];
}