import { describe, expect, it, vi, afterEach } from "vitest";
import { estimateSupply, sampleSubstrate, stamp, verifySample } from "./btc-substrate";
afterEach(() => vi.unstubAllGlobals());
function mockNetwork() {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url.endsWith("/blocks/tip/hash")) return new Response("a".repeat(64));
    if (url.includes("/block/")) return Response.json({ height: 840_000, tx_count: 1000, size: 1_000_000 });
    if (url.endsWith("/mempool")) return Response.json({ count: 100, vsize: 1_000_000 });
    if (url.endsWith("/v1/prices")) return Response.json({ USD: 60_000 });
    return Response.json({ currentHashrate: 1e18, currentDifficulty: 1e12 });
  }));
}
describe("Truth Substrate recorded measurement integrity", () => {
  it("uses halving-aware supply without accepting invented heights", () => {
    expect(estimateSupply(210_000)).toBe(10_500_000);
    expect(estimateSupply(420_000)).toBe(15_750_000);
    expect(() => estimateSupply(NaN)).toThrow();
  });
  it("uses the named block height and verifies the stored full-sample fingerprint", async () => {
    mockNetwork(); const sample = await sampleSubstrate();
    const recorded = { ...sample, fingerprint: stamp(sample) };
    expect(sample.block.height).toBe(840_000);
    expect(recorded.fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(verifySample(recorded)).toBe(true);
    expect(verifySample({ ...recorded, difficulty: 2e12 })).toBe(false);
    expect(verifySample(sample)).toBe(false);
  });
  it("rejects derived math drift even when a fingerprint is recomputed", async () => {
    mockNetwork(); const sample = { ...await sampleSubstrate(), oreIndex: 99 };
    expect(verifySample({ ...sample, fingerprint: stamp(sample) })).toBe(false);
  });
  it("does not synthesize a missing measurement", async () => {
    vi.stubGlobal("fetch", async (url: string) => url.endsWith("/blocks/tip/hash") ? new Response("a".repeat(64)) : Response.json({}));
    await expect(sampleSubstrate()).rejects.toThrow("Missing or invalid network measurement");
  });
});