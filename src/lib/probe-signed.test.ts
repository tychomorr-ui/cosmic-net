// Contract tests for probeSignedStatus. The verifier MUST be fail-closed:
// only a valid ed25519 signature over `${payload_cid}|${ts}`, with a
// recomputable payload_cid and a pub that matches the expected pubkey,
// yields { state: "measured" }. Every other shape collapses to
// "reachable" (200 but untrusted) or "unreachable".

import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { ed25519 } from "@noble/curves/ed25519.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";
import { probeSignedStatus } from "./probe-signed";

function canonical(o: unknown): string {
  if (o === null || typeof o !== "object" || Array.isArray(o)) return JSON.stringify(o);
  const obj = o as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonical(obj[k])).join(",") + "}";
}

// Deterministic key for reproducible signatures across CI runs.
const SEED = hexToBytes("0".repeat(63) + "1");
const PUB = bytesToHex(ed25519.getPublicKey(SEED));

type Envelope = {
  v?: string;
  node?: string;
  ts?: number;
  payload?: Record<string, unknown>;
  payload_cid?: string;
  sig?: string;
  pub?: string;
};

function buildEnvelope(overrides: Partial<Envelope> = {}): Envelope {
  const ts = overrides.ts ?? Math.floor(Date.now() / 1000);
  const payload = overrides.payload ?? { node: "test", ts, kernel: "k", uname: "u" };
  const payload_cid =
    overrides.payload_cid ?? bytesToHex(sha256(utf8ToBytes(canonical(payload))));
  const msg = `${payload_cid}|${ts}`;
  const sig = overrides.sig ?? bytesToHex(ed25519.sign(utf8ToBytes(msg), SEED));
  const pub = overrides.pub ?? PUB;
  return {
    v: "ARCHANGEL/v0",
    node: "test",
    ts,
    payload,
    payload_cid,
    sig,
    pub,
    ...overrides,
  };
}

function mockFetch(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  const ok = init.ok ?? true;
  const status = init.status ?? 200;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok,
      status,
      json: async () => body,
    })),
  );
}

describe("probeSignedStatus · ARCHANGEL/v0 reference envelope", () => {
  beforeEach(() => vi.useFakeTimers().setSystemTime(new Date("2026-06-29T20:00:00Z")));
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("returns measured for a valid envelope", async () => {
    const ts = Math.floor(Date.now() / 1000);
    mockFetch(buildEnvelope({ ts }));
    const r = await probeSignedStatus("https://x/status", PUB);
    expect(r.state).toBe("measured");
    expect("detail" in r && r.detail).toMatch(/signed · cid matched/);
  });

  it("is case-insensitive on pub hex", async () => {
    mockFetch(buildEnvelope());
    const r = await probeSignedStatus("https://x/status", PUB.toUpperCase());
    expect(r.state).toBe("measured");
  });

  it("rejects when pub does not match expected", async () => {
    mockFetch(buildEnvelope({ pub: "a".repeat(64) }));
    const r = await probeSignedStatus("https://x/status", PUB);
    expect(r.state).toBe("reachable");
    expect("detail" in r && r.detail).toMatch(/pub mismatch/);
  });

  it("rejects when payload_cid does not match recomputed sha256", async () => {
    mockFetch(buildEnvelope({ payload_cid: "0".repeat(64) }));
    const r = await probeSignedStatus("https://x/status", PUB);
    expect(r.state).toBe("reachable");
    expect("detail" in r && r.detail).toMatch(/payload_cid drift/);
  });

  it("rejects when payload is mutated after signing (cid drift)", async () => {
    const env = buildEnvelope();
    // Mutate payload AFTER cid/sig were computed; recompute will diverge.
    env.payload = { ...env.payload, tampered: true };
    mockFetch(env);
    const r = await probeSignedStatus("https://x/status", PUB);
    expect(r.state).toBe("reachable");
    expect("detail" in r && r.detail).toMatch(/payload_cid drift/);
  });

  it("rejects when signature is corrupted but well-formed hex", async () => {
    const env = buildEnvelope();
    env.sig = "f".repeat(128);
    mockFetch(env);
    const r = await probeSignedStatus("https://x/status", PUB);
    expect(r.state).toBe("reachable");
    expect("detail" in r && r.detail).toMatch(/signature invalid/);
  });

  it("rejects when signature is malformed (non-hex)", async () => {
    mockFetch(buildEnvelope({ sig: "not-hex" }));
    const r = await probeSignedStatus("https://x/status", PUB);
    expect(r.state).toBe("reachable");
    expect("detail" in r && r.detail).toMatch(/signature invalid/);
  });

  it("rejects when signature was made by a different key", async () => {
    const otherSeed = hexToBytes("0".repeat(63) + "2");
    const ts = Math.floor(Date.now() / 1000);
    const payload = { node: "test", ts };
    const cid = bytesToHex(sha256(utf8ToBytes(canonical(payload))));
    const sig = bytesToHex(ed25519.sign(utf8ToBytes(`${cid}|${ts}`), otherSeed));
    mockFetch(buildEnvelope({ ts, payload, payload_cid: cid, sig }));
    const r = await probeSignedStatus("https://x/status", PUB);
    // pub still matches expected, but sig was made by otherSeed → invalid.
    expect(r.state).toBe("reachable");
    expect("detail" in r && r.detail).toMatch(/signature invalid/);
  });

  it("flags stale payloads even when signature is valid", async () => {
    const ts = Math.floor(Date.now() / 1000) - 600; // 10 min old
    mockFetch(buildEnvelope({ ts }));
    const r = await probeSignedStatus("https://x/status", PUB);
    expect(r.state).toBe("reachable");
    expect("detail" in r && r.detail).toMatch(/stale/);
  });

  it("returns unreachable on non-2xx", async () => {
    mockFetch({}, { ok: false, status: 502 });
    const r = await probeSignedStatus("https://x/status", PUB);
    expect(r.state).toBe("unreachable");
    expect("detail" in r && r.detail).toMatch(/HTTP 502/);
  });

  it("returns unreachable on fetch error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("dns fail");
      }),
    );
    const r = await probeSignedStatus("https://x/status", PUB);
    expect(r.state).toBe("unreachable");
    expect("detail" in r && r.detail).toMatch(/dns fail/);
  });

  it("does not accept an opaque 200 JSON without envelope fields", async () => {
    mockFetch({ ok: true, status: "fine" });
    const r = await probeSignedStatus("https://x/status", PUB);
    expect(r.state).toBe("reachable");
    // Falls through to daemon-shape parse, which rejects on missing sig_ed25519.
    expect("detail" in r && r.detail).toMatch(/sig_ed25519|malformed/);
  });
});
