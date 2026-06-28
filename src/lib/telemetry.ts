// Sovereign telemetry. Three modes:
//   "off"      — default. Nothing recorded, nothing sent.
//   "local"    — opt-in. Events appended to IndexedDB only. No egress.
//   "posthog"  — opt-in. Legacy PostHog ingest, fully centralized.
//
// The mode is persisted in localStorage so it survives reloads without
// requiring any backend. Default is "off" — every install is silent until
// the operator flips the switch.

import { get as idbGet, set as idbSet } from "idb-keyval";

export type TelemetryMode = "off" | "local" | "posthog";

const MODE_KEY = "cmap.telemetry.mode.v1";
const LOG_KEY = "cmap.telemetry.local-log.v1";
const MAX_LOG = 500;

export type LocalEvent = {
  ts: number;
  name: string;
  url?: string;
  props?: Record<string, unknown>;
};

export function getTelemetryMode(): TelemetryMode {
  if (typeof window === "undefined") return "off";
  const v = window.localStorage.getItem(MODE_KEY);
  return v === "local" || v === "posthog" ? v : "off";
}

export function setTelemetryMode(mode: TelemetryMode): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MODE_KEY, mode);
}

export async function recordLocalEvent(ev: LocalEvent): Promise<void> {
  if (getTelemetryMode() !== "local") return;
  try {
    const prev = ((await idbGet(LOG_KEY)) as LocalEvent[] | undefined) ?? [];
    const next = [...prev, ev].slice(-MAX_LOG);
    await idbSet(LOG_KEY, next);
  } catch {
    /* IDB unavailable — drop the event rather than fall back to a centralized sink */
  }
}

export async function readLocalLog(): Promise<LocalEvent[]> {
  try {
    return ((await idbGet(LOG_KEY)) as LocalEvent[] | undefined) ?? [];
  } catch {
    return [];
  }
}

export async function clearLocalLog(): Promise<void> {
  try {
    await idbSet(LOG_KEY, []);
  } catch {
    /* noop */
  }
}
