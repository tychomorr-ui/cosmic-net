import { useSyncExternalStore } from "react";
import { NODES } from "@/data/nodes";
import { probeCorsJson, probeOpaqueHead, type ProbeStatus } from "./probes";

type Store = Map<string, ProbeStatus>;

const store: Store = new Map(NODES.map((n) => [n.id, { state: "idle" } as ProbeStatus]));
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function getSnapshot(): Store {
  return store;
}

function getServerSnapshot(): Store {
  return store;
}

export function useProbeStatus(id: string): ProbeStatus {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return snap.get(id) ?? { state: "idle" };
}

async function runOne(id: string) {
  const node = NODES.find((n) => n.id === id);
  if (!node?.probe) return;
  store.set(id, { state: "probing", at: Date.now() });
  emit();
  const status =
    node.probe.kind === "cors-json"
      ? await probeCorsJson(node.probe.url, node.probe.okField)
      : await probeOpaqueHead(node.probe.url);
  store.set(id, status);
  emit();
}

let started = false;
export function startProbes(intervalMs = 30_000) {
  if (started || typeof window === "undefined") return;
  started = true;
  const ids = NODES.filter((n) => n.probe).map((n) => n.id);
  const tick = () => ids.forEach((id) => void runOne(id));
  tick();
  setInterval(tick, intervalMs);
}
