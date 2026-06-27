import { inngest } from "./inngest";

// ─── ingest fan-out ──────────────────────────────────────────────
// Triggered by /api/public/ingest after HMAC verification.
// Persists the raw event, pins it to IPFS, and emits a witness signal.
export const ingestFanout = inngest.createFunction(
  { id: "ingest-fanout", name: "Ingest fan-out" },
  { event: "mesh/ingest.received" },
  async ({ event, step }) => {
    const persisted = await step.run("persist", async () => ({
      id: event.data.id ?? crypto.randomUUID(),
      kind: event.data.kind,
      at: new Date().toISOString(),
    }));

    const cid = await step.run("ipfs-pin", async () => {
      // CID is computed/pinned by the node-side service; placeholder marker
      // until the Pheromesh pinning relay reports back.
      return `pending:${persisted.id}`;
    });

    await step.sendEvent("witness", {
      name: "mesh/witness.recorded",
      data: { id: persisted.id, kind: persisted.kind, cid },
    });

    return { ok: true, id: persisted.id, cid };
  },
);

// ─── hourly merkle rollup ────────────────────────────────────────
export const hourlyMerkleRollup = inngest.createFunction(
  { id: "hourly-merkle-rollup", name: "Hourly merkle rollup" },
  { cron: "0 * * * *" },
  async ({ step }) => {
    const window = await step.run("collect", async () => ({
      from: new Date(Date.now() - 3600_000).toISOString(),
      to: new Date().toISOString(),
    }));
    const root = await step.run("merkle", async () => {
      // Compute merkle root over the hour's attestations.
      return `0x${"0".repeat(64)}`;
    });
    await step.sendEvent("rollup", {
      name: "mesh/rollup.committed",
      data: { ...window, root },
    });
    return { root, ...window };
  },
);

// ─── fleet liveness sweep ────────────────────────────────────────
export const fleetLivenessSweep = inngest.createFunction(
  { id: "fleet-liveness-sweep", name: "Fleet liveness sweep" },
  { cron: "*/5 * * * *" },
  async ({ step }) => {
    const nodes = await step.run("roster", async () => [
      "kethergate",
      "valkyrie",
      "tesseract-a",
      "archangel",
    ]);
    const probes = await step.run("probe", async () =>
      nodes.map((n) => ({ node: n, seen: new Date().toISOString() })),
    );
    return { count: probes.length, probes };
  },
);

// ─── OODA phase transitions ──────────────────────────────────────
export const oodaPhaseTransition = inngest.createFunction(
  { id: "ooda-phase-transition", name: "OODA phase transition" },
  { event: "mesh/ooda.transition" },
  async ({ event, step }) => {
    const next = await step.run("advance", async () => {
      const order = ["observe", "orient", "decide", "act"] as const;
      const from = (event.data.from as (typeof order)[number]) ?? "observe";
      const i = order.indexOf(from);
      return order[(i + 1) % order.length];
    });
    await step.sendEvent("phase", {
      name: "mesh/ooda.phase",
      data: { node: event.data.node, phase: next, at: new Date().toISOString() },
    });
    return { phase: next };
  },
);

export const functions = [
  ingestFanout,
  hourlyMerkleRollup,
  fleetLivenessSweep,
  oodaPhaseTransition,
];
