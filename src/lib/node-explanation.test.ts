import { describe, expect, it } from "vitest";
import { evidenceSchema, failureEvidence, selectExplanation } from "./node-explanation";

describe("evidence-only AI explanations", () => {
  it("never generates evidence for successful or pending checks", () => {
    expect(failureEvidence("root-gate", { state: "measured", at: 10, detail: "cid matched" })).toBeNull();
    expect(failureEvidence("root-gate", { state: "probing", at: 10 })).toBeNull();
    expect(failureEvidence("root-gate", { state: "idle" })).toBeNull();
  });
  it("retains recorded HTTP facts without exposing raw response data", () => {
    expect(failureEvidence("root-gate", { state: "unreachable", at: 123, detail: "HTTP 503" })).toEqual({ nodeId: "root-gate", at: 123, code: "http", httpStatus: 503 });
  });
  it("does not infer a specific cause from ambiguous fetch errors", () => {
    const evidence = failureEvidence("root-gate", { state: "unreachable", at: 123, detail: "Failed to fetch https://private.example?token=secret" });
    expect(evidence?.code).toBe("network");
    expect(JSON.stringify(evidence)).not.toContain("secret");
    if (!evidence) throw new Error("missing evidence");
    expect(selectExplanation(evidence, 0)).toContain("cause is not established");
  });
  it("preserves recorded trust status and admits no model-created claims", () => {
    const status = Object.freeze({ state: "reachable" as const, at: 123, detail: "signed · signature mismatch" });
    const evidence = failureEvidence("root-gate", status);
    if (!evidence) throw new Error("missing evidence");
    expect(selectExplanation(evidence, 0)).toContain("remains unverified");
    expect(status.state).toBe("reachable");
    expect(() => selectExplanation(evidence, 99)).toThrow("Invalid AI selection");
    expect(() => selectExplanation(evidence, Number.NaN)).toThrow();
  });
  it("distinguishes CID and freshness failures from signing failures", () => {
    expect(failureEvidence("root-gate", { state: "reachable", at: 1, detail: "signed · cid mismatch" })?.code).toBe("cid");
    expect(failureEvidence("root-gate", { state: "reachable", at: 1, detail: "signed · stale" })?.code).toBe("stale");
  });
  it("rejects extra raw payload and invalid recorded timestamps", () => {
    expect(evidenceSchema.safeParse({ nodeId: "root-gate", at: 1, code: "network", payload: "secret" }).success).toBe(false);
    expect(evidenceSchema.safeParse({ nodeId: "root-gate", at: NaN, code: "network" }).success).toBe(false);
  });
});