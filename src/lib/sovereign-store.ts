// Sovereign local store. Synchronous reads via localStorage (so existing
// call sites stay sync), write-through mirror to IndexedDB for durability
// + larger quota. On boot, hydrate from IDB into localStorage if IDB has
// a value and localStorage doesn't — this lets us survive cache clears
// that wipe localStorage but leave IDB.
//
// No data leaves the browser. No managed service.

import { get as idbGet, set as idbSet, keys as idbKeys } from "idb-keyval";

const SOVEREIGN_KEYS = [
  "nexinus.pam.truths.v1",
  "nexinus.pam.envelopes.v1",
  "nexinus.terminus.truth-chain.v1",
  "nexinus.terminus.fleet.v1",
];

let hydrated = false;

export function kvGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(key);
}

export function kvSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, value);
  // Mirror to IDB without blocking the caller.
  void idbSet(key, value).catch(() => {
    /* IDB unavailable in some private-mode browsers — localStorage is the source of truth */
  });
}

/** Pull any IDB-only values into localStorage. Call once at app boot. */
export async function kvHydrate(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  if (typeof window === "undefined") return;
  try {
    const idbAll = await idbKeys();
    const targets = new Set(SOVEREIGN_KEYS);
    for (const k of idbAll) {
      const key = typeof k === "string" ? k : String(k);
      if (!targets.has(key)) continue;
      if (window.localStorage.getItem(key) !== null) continue;
      const v = await idbGet(key);
      if (typeof v === "string") window.localStorage.setItem(key, v);
    }
  } catch {
    /* fail-open: localStorage still works */
  }
}
