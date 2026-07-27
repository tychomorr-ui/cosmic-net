// Regression tests for the hardened ARCHANGEL/v0 envelope verifier.
// Each case here corresponds to a finding from the 2026-07 mesh Ed25519 audit.
// If any of these go green->red, a CID/signature spoof surface has reopened.

import { describe, expect, it } from "vitest";
import { ed25519 } from "@noble/curves/ed25519.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";
import { canonical, verifyEnvelope, isReference } from "./signed-envelope";

const SEED = hexToBytes("0".repeat(63) + "1");
const PUB = bytesToHex(ed25519.getPublicKey(SEED));

function env(over: Record<string, unknown> = {}) {
  const ts = (over.ts as number) ?? Math.floor(Date.now() / 1000);
  const payload = (over.payload as Record<string, unknown>) ?? { node: "t", ts };
  const payload_cid = (over.payload_cid as string) ?? bytesToHex(sha256(utf8ToBytes(canonical(payload))));
  const sig = (over.sig as string) ?? bytesToHex(ed25519.sign(utf8ToBytes(`${payload_cid}|${ts}`), SEED));
  return { v: "ARCHANGEL/v0", node: "t", ts, payload, payload_cid, sig, pub: PUB, ...over };
}

describe("canonical() determinism", () => {
  it("sorts keys regardless of insertion order", () => {
    expect(canonical({ b: 1, a: 2 })).toBe(canonical({ a: 2, b: 1 }));
  });
  it("canonicalizes nested objects inside arrays (was JSON.stringify passthrough)", () => {
    expect(canonical({ x: [{ b: 1, a: 2 }] })).toBe('{"x":[{"a":2,"b":1}]}');
    expect(canonical({ x: [{ b: 1, a: 2 }] })).toBe(canonical({ x: [{ a: 2, b: 1 }] }));
  });
  it("throws on non-finite numbers rather than emitting null", () => {
    expect(() => canonical({ n: Number.NaN })).toThrow();
    expect(() => canonical({ n: Number.POSITIVE_INFINITY })).toThrow();
  });
  it("throws on undefined / functions instead of dropping them", () => {
    expect(() => canonical({ f: () => 1 })).toThrow();
  });
});

describe("isReference() shape gate", () => {
  it("rejects null payload", () => {
    expect(isReference(env({ payload: null }))).toBe(false);
  });
  it("rejects array payload", () => {
    expect(isReference(env({ payload: [] }))).toBe(false);
  });
});

describe("verifyEnvelope() fail-closed", () => {
  const now = Date.now();

  it("accepts a well-formed fresh envelope", () => {
    const r = verifyEnvelope(env(), PUB, now);
    expect(r.state).toBe("measured");
  });

  it("rejects a future-dated ts (previously clamped to 0s fresh)", () => {
    const ts = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365;
    const r = verifyEnvelope(env({ ts }), PUB, now);
    expect(r.state).toBe("reachable");
    expect("detail" in r && r.detail).toMatch(/future/);
  });

  it("tolerates small negative clock skew", () => {
    const ts = Math.floor(Date.now() / 1000) + 5;
    expect(verifyEnvelope(env({ ts }), PUB, now).state).toBe("measured");
  });

  it("rejects an uppercase / wrong-length signature before crypto", () => {
    expect(verifyEnvelope(env({ sig: "ab" }), PUB, now).state).toBe("reachable");
  });

  it("rejects a non-hex payload_cid", () => {
    expect(verifyEnvelope(env({ payload_cid: "zz" }), PUB, now).state).toBe("reachable");
  });

  it("rejects a non-integer ts", () => {
    expect(verifyEnvelope(env({ ts: 1.5 }), PUB, now).state).toBe("reachable");
  });

  it("rejects a pub that is not the pinned key", () => {
    const other = bytesToHex(ed25519.getPublicKey(hexToBytes("0".repeat(63) + "2")));
    const r = verifyEnvelope(env(), other, now);
    expect(r.state).toBe("reachable");
    expect("detail" in r && r.detail).toMatch(/pub mismatch/);
  });

  it("never returns measured for a stale envelope", () => {
    const ts = Math.floor(Date.now() / 1000) - 10_000;
    const r = verifyEnvelope(env({ ts }), PUB, now);
    expect(r.state).toBe("reachable");
    expect("detail" in r && r.detail).toMatch(/stale/);
  });

  it("rejects garbage bodies", () => {
    for (const b of [null, 42, "x", [], {}]) {
      expect(verifyEnvelope(b, PUB, now).state).toBe("reachable");
    }
  });
});
