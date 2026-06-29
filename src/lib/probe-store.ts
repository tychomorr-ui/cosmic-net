import { useSyncExternalStore } from "react";
import { NODES } from "@/data/nodes";
import { probeCorsJson, probeOpaqueHead, type ProbeStatus } from "./probes";
import { getOverride } from "./node-overrides";

type Store = Map<string, ProbeStatus>;

const store: Store = new Map(NODES.map((n) => [n.id, { state: "idle" } as ProbeStatus]));
const listeners = new Set<() => void>();

// ---- bounded ticker event buffer (sliding window, max 64) ----
export type TickerEvent = {
  id: string;        // monotonic seq
  ts: number;
  tag: string;       // node display name uppercased
  state: ProbeStatus["state"];
  detail: string;    // e.g. "200 OK", "opaque success", "HTTP 502"
};

const MAX_EVENTS = 64;
let events: TickerEvent[] = [];
let seq = 0;
const eventListeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}
function emitEvents() {
  for (const l of eventListeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
function subscribeEvents(l: () => void) {
  eventListeners.add(l);
  return () => eventListeners.delete(l);
}

function getSnapshot(): Store {
  return store;
}
function getServerSnapshot(): Store {
  return store;
}
function getEventsSnapshot(): TickerEvent[] {
  return events;
}
function getServerEventsSnapshot(): TickerEvent[] {
  return events;
}

export function useProbeStatus(id: string): ProbeStatus {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot).get(id) ?? { state: "idle" };
}

export function useTickerEvents(): TickerEvent[] {
  return useSyncExternalStore(subscribeEvents, getEventsSnapshot, getServerEventsSnapshot);
}

function pushEvent(ev: Omit<TickerEvent, "id">) {
  const next: TickerEvent = { id: String(++seq), ...ev };
  events = [next, ...events].slice(0, MAX_EVENTS);
  emitEvents();
}

function detailFor(s: ProbeStatus): string {
  switch (s.state) {
    case "measured":     return `200 OK · ${s.detail}`;
    case "reachable":    return `LATENCY_NOMINAL · ${s.detail}`;
    case "unreachable":  return `UNREACHABLE · ${s.detail}`;
    case "probing":      return "PROBING";
    default:             return "IDLE";
  }
}

async function runOne(id: string) {
  const node = NODES.find((n) => n.id === id);
  if (!node?.probe) return;
  // Operator-supplied override (e.g. Valkyrie signed-status pubkey) wins.
  const ov = getOverride(id);
  const probe = ov ?? node.probe;
  store.set(id, { state: "probing", at: Date.now() });
  emit();
  const status =
    probe.kind === "cors-json"
      ? await probeCorsJson(probe.url, probe.okField)
      : probe.kind === "signed-status"
      ? await (await import("./probe-signed")).probeSignedStatus(
          probe.url,
          probe.edPubHex ?? "",
        )
      : await probeOpaqueHead(probe.url);
  store.set(id, status);
  emit();
  pushEvent({
    ts: Date.now(),
    tag: node.name.toUpperCase(),
    state: status.state,
    detail: detailFor(status),
  });
}

let started = false;
export function startProbes(intervalMs = 15_000) {
  if (started || typeof window === "undefined") return;
  started = true;
  const ids = NODES.filter((n) => n.probe).map((n) => n.id);
  // Seed the buffer so the ticker has something to render before first probe completes.
  pushEvent({ ts: Date.now(), tag: "ARCHANGEL", state: "probing", detail: "UPLINK INITIATED" });
  const tick = () => ids.forEach((id) => void runOne(id));
  tick();
  setInterval(tick, intervalMs);
}
