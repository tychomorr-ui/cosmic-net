// Golden-vector test for ARCHANGEL/v0 canonicalization. If this fails, the
// Go daemon and the browser verifier will silently drift apart and every
// signature will be REACHABLE/invalid forever. Treat any red here as P0.

import { describe, expect, it } from "vitest";
import { canonicalize, isFresh, STATELESS_TTL_SECONDS } from "./index";
import golden from "../spec/golden-vectors.json";

describe("ARCHANGEL/v0 canonicalize()", () => {
  for (const v of golden.vectors) {
    it(`vector: ${v.name}`, () => {
      expect(canonicalize(v.payload)).toBe(v.canonical_utf8);
    });
  }
});

describe("ARCHANGEL/v0 isFresh()", () => {
  it("accepts a fresh ts", () => {
    expect(isFresh(1000, 1000)).toBe(true);
    expect(isFresh(1000, 1000 + STATELESS_TTL_SECONDS)).toBe(true);
  });
  it("rejects an expired ts", () => {
    expect(isFresh(1000, 1000 + STATELESS_TTL_SECONDS + 1)).toBe(false);
  });
  it("rejects a future ts", () => {
    expect(isFresh(2000, 1000)).toBe(false);
  });
  it("rejects non-finite ts", () => {
    expect(isFresh(Number.NaN, 1000)).toBe(false);
  });
});
