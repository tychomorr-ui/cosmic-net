import { beforeEach, describe, expect, it, vi } from "vitest";
const store = vi.hoisted(() => new Map<string, string>());
vi.mock("@/lib/sovereign-store", () => ({ kvGet: (k: string) => store.get(k) ?? null, kvSet: (k: string, v: string) => store.set(k, v) }));
import { appendEnvelope, loadEnvelopes, repairChain, verifyChain } from "./truth-ledger";
const input = { lane: "Core" as const, request: "Audit evidence", reflection: "Mirror recorded truth", truths: [], next_move: "Verify the chain" };
beforeEach(() => { store.clear(); vi.stubGlobal("window", {}); });
describe("PAM append-only evidence", () => {
  it("records reflection and verifies CID ancestry", async () => {
    const a = await appendEnvelope(input); const b = await appendEnvelope(input);
    expect(b.prev_cid).toBe(a.cid);
    expect(await verifyChain()).toEqual({ ok: true });
  });
  it("requires non-emergency reflection", async () => {
    await expect(appendEnvelope({ ...input, reflection: "" })).rejects.toThrow("requires reflection");
    expect(loadEnvelopes()).toHaveLength(0);
  });
  it("refuses append and restamping after tampering, preserving original bytes", async () => {
    await appendEnvelope(input);
    const key = "nexinus.pam.envelopes.v1";
    const value = JSON.stringify(loadEnvelopes().map((e) => ({ ...e, request: "altered" })));
    store.set(key, value);
    expect(await verifyChain()).toEqual({ ok: false, breakAt: 0 });
    await expect(appendEnvelope(input)).rejects.toThrow("chain integrity fault");
    await expect(repairChain()).rejects.toThrow("Append-only invariant");
    expect(store.get(key)).toBe(value);
  });
  it("refuses concurrent competing append rather than forking", async () => {
    const results = await Promise.allSettled([appendEnvelope(input), appendEnvelope(input)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(loadEnvelopes()).toHaveLength(1);
    expect(await verifyChain()).toEqual({ ok: true });
  });
});