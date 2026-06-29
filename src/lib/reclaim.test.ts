// Determinism contract for the Reclaim bundle. If any of these fail, two
// operators exporting identical sovereign state will produce different CIDs
// and the "same state ⇒ same receipt" guarantee is gone. P0.
//
// Runs in node — no window. Provides a tiny in-memory localStorage shim so
// kvSet/kvGet work during import-roundtrip tests.

import "fake-indexeddb/auto";
import { describe, expect, it, beforeEach } from "vitest";
import * as dagJson from "@ipld/dag-json";

class MemStorage {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
  key(i: number) { return Array.from(this.m.keys())[i] ?? null; }
  get length() { return this.m.size; }
}

(globalThis as unknown as { window: unknown }).window = {
  localStorage: new MemStorage(),
};
(globalThis as unknown as { localStorage: unknown }).localStorage =
  (globalThis as unknown as { window: { localStorage: unknown } }).window.localStorage;

const { exportBundle, reExport, importBundle, buildPayload, RECLAIM_VERSION } =
  await import("./reclaim");
const { kvSet } = await import("./sovereign-store");
const { valueToCid, canonicalize } = await import("./cid");

function seed() {
  kvSet(
    "nexinus.pam.truths.v1",
    JSON.stringify([
      { id: "t-b", statement: "second", declared_at: 2 },
      { id: "t-a", statement: "first", declared_at: 1 },
    ]),
  );
  kvSet(
    "nexinus.pam.envelopes.v1",
    JSON.stringify([
      { ts: 2, cid: "bafy-z", prev_cid: null, lane: "warrior", drift: null, kind: "x", body: {} },
      { ts: 1, cid: "bafy-a", prev_cid: null, lane: "warrior", drift: null, kind: "x", body: {} },
    ]),
  );
  kvSet(
    "nexinus.terminus.truth-chain.v1",
    JSON.stringify([
      { id: "n-2", label: "two" },
      { id: "n-1", label: "one" },
    ]),
  );
}

beforeEach(() => {
  (globalThis as unknown as { window: { localStorage: MemStorage } }).window.localStorage.clear();
});

describe("reclaim: determinism", () => {
  it("payload_cid is stable across repeated exports of identical state", async () => {
    seed();
    const a = await exportBundle({ exportedAt: 1_700_000_000_000 });
    const b = await exportBundle({ exportedAt: 1_999_999_999_999 });
    expect(a.receipt.payload_cid).toBe(b.receipt.payload_cid);
    // outer envelope changes because exported_at differs
    expect(a.receipt.cid).not.toBe(b.receipt.cid);
  });

  it("reExport with the same receipt yields byte-identical bytes", async () => {
    seed();
    const first = await exportBundle({ exportedAt: 1_700_000_000_000 });
    const second = await reExport(first.receipt);
    expect(second.bytes.byteLength).toBe(first.bytes.byteLength);
    for (let i = 0; i < first.bytes.byteLength; i++) {
      expect(second.bytes[i]).toBe(first.bytes[i]);
    }
    expect(second.receipt.cid).toBe(first.receipt.cid);
  });

  it("input row order does not affect payload_cid", async () => {
    seed();
    const a = await exportBundle({ exportedAt: 1 });
    // reverse the persisted order
    kvSet(
      "nexinus.pam.truths.v1",
      JSON.stringify([
        { id: "t-a", statement: "first", declared_at: 1 },
        { id: "t-b", statement: "second", declared_at: 2 },
      ]),
    );
    kvSet(
      "nexinus.pam.envelopes.v1",
      JSON.stringify([
        { ts: 1, cid: "bafy-a", prev_cid: null, lane: "warrior", drift: null, kind: "x", body: {} },
        { ts: 2, cid: "bafy-z", prev_cid: null, lane: "warrior", drift: null, kind: "x", body: {} },
      ]),
    );
    kvSet(
      "nexinus.terminus.truth-chain.v1",
      JSON.stringify([
        { id: "n-1", label: "one" },
        { id: "n-2", label: "two" },
      ]),
    );
    const b = await exportBundle({ exportedAt: 1 });
    expect(b.receipt.payload_cid).toBe(a.receipt.payload_cid);
  });

  it("bytes round-trip through dag-json decode/encode unchanged", async () => {
    seed();
    const { bytes } = await exportBundle({ exportedAt: 42 });
    const reEncoded = canonicalize(dagJson.decode(bytes));
    expect(reEncoded.byteLength).toBe(bytes.byteLength);
    for (let i = 0; i < bytes.byteLength; i++) expect(reEncoded[i]).toBe(bytes[i]);
  });

  it("payload_cid recomputes to the declared value", async () => {
    seed();
    const { bundle, receipt } = await exportBundle({ exportedAt: 7 });
    const recomputed = await valueToCid(bundle.payload);
    expect(recomputed).toBe(receipt.payload_cid);
    expect(bundle.v).toBe(RECLAIM_VERSION);
  });

  it("import verifies declared payload_cid and reports round_trip_ok", async () => {
    seed();
    const { bytes, receipt } = await exportBundle({ exportedAt: 99 });
    // wipe state, then re-import
    (globalThis as unknown as { window: { localStorage: MemStorage } }).window.localStorage.clear();
    const report = await importBundle(bytes, "replace");
    expect(report.verified).toBe(true);
    expect(report.round_trip_ok).toBe(true);
    expect(report.payload_cid).toBe(receipt.payload_cid);
  });

  it("import rejects a tampered payload_cid", async () => {
    seed();
    const { bundle } = await exportBundle({ exportedAt: 5 });
    const tampered = { ...bundle, payload_cid: "bafytamperedtamperedtamperedtamperedtamperedtampered" };
    const bytes = canonicalize(tampered);
    await expect(importBundle(bytes, "merge")).rejects.toThrow(/payload CID mismatch/);
  });

  it("empty state still produces a deterministic payload_cid", async () => {
    const a = await exportBundle({ exportedAt: 1 });
    const b = await exportBundle({ exportedAt: 2 });
    expect(a.receipt.payload_cid).toBe(b.receipt.payload_cid);
    expect(buildPayload().truths).toEqual([]);
  });
});
