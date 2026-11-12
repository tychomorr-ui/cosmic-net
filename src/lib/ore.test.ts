import { describe, expect, it } from "vitest";
import { buildClaim, contractGrade, linkHash, oreHash, oreLoads, traceLedger } from "./ore";

function claim(text = "Distinct recorded signal ⛬ ◈ ◇ ⌬", prev: unknown[] = [], now = 1) {
  const c = buildClaim(text, "coinage", prev, undefined, now);
  if (!c) throw new Error("Test input must refine");
  return c;
}

describe("Digital Ore contract alignment and ancestry", () => {
  it("matches contract integer grade on concrete scores", () => {
    expect(contractGrade(100, 100, 100, 100)).toBe(1_000_000);
    expect(contractGrade(50, 60, 70, 80)).toBe(168_000);
    expect(contractGrade(1, 1, 1, 1)).toBe(0);
  });
  it("rejects scores outside integer 0..100", () => {
    for (const n of [-1, 101, 0.5, NaN]) expect(() => contractGrade(n, 100, 100, 100)).toThrow("InvalidScores");
  });
  it("refuses zero-grade recording", () => {
    expect(buildClaim("aaaa", "directive", [])).toBeNull();
  });
  it("binds 64-character SHA-256 to recorded text and source", () => {
    expect(oreHash("directive", "ab")).toMatch(/^[a-f0-9]{64}$/);
    expect(oreHash("directive", "ab")).not.toBe(oreHash("coinage", "ab"));
  });
  it("traces a real two-claim chain and sums verified loads", () => {
    const a = claim(); const b = claim("More recorded signal ⛬ ◈ ◇ ⌬", [a], 2);
    expect(traceLedger([b, a]).map((t) => t.status)).toEqual(["VERIFIED", "VERIFIED"]);
    expect(oreLoads([b, a])).toMatchObject({ motherLoad: a.grade + b.grade, veinLoad: a.grade + b.grade, verified: 2 });
  });
  it("excludes score or tier drift and broken descendants", () => {
    const a = claim(); const b = claim("A second measured contribution", [a], 2);
    const changed = { ...a, scores: { ...a.scores, novelty: 0 } };
    expect(traceLedger([b, changed]).map((t) => t.status)).toEqual(["BROKEN_LINK", "DRIFT"]);
    expect(oreLoads([b, changed]).motherLoad).toBe(0);
    expect(traceLedger([{ ...a, tier: "TRACE" }])[0].status).toBe("DRIFT");
  });
  it("does not count duplicate identities or legacy entries", () => {
    const a = claim();
    expect(oreLoads([a, a, { id: "old", fullText: "legacy" }])).toMatchObject({ verified: 0, excluded: 3, motherLoad: 0 });
    expect(traceLedger([null])[0].status).toBe("LEGACY");
  });
  it("refuses broken-link continuation and does not rewrite evidence", () => {
    const a = claim(); const bad = { ...a, link: linkHash(null, "bad") };
    expect(traceLedger([bad])[0].status).toBe("BROKEN_LINK");
    expect(() => claim("Additional text", [bad])).toThrow("Ledger integrity fault");
    expect(bad.link).toBe(linkHash(null, "bad"));
  });
  it("allocates distinct identities at the same clock instant", () => {
    expect(claim().id).not.toBe(claim().id);
  });
});