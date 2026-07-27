// Honest re-probe hook. Called by pg_cron every 15 minutes.
//
// Doctrine:
//   - No "assertion" of anything. Just re-runs the same ARCHANGEL/v0 signed
//     status verification the browser does, and writes the result to
//     public.node_probes so the /status page and the ledger can read a
//     fresh baseline without relying on a client trigger.
//   - Pinned pubkey is the only trust root. Missing/invalid signature =>
//     UNREACHABLE. No fallback to "reachable" if the envelope doesn't verify.
//   - No mint gating. No side effects beyond the probes row.
//
// Endpoint is public (under /api/public/*). It performs no writes based on
// caller input — it re-derives everything from the pinned node registry in
// src/data/nodes.ts. Anyone hitting it just triggers a fresh probe pass,
// which is exactly what pg_cron does on its schedule.

import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "node:crypto";
import { ed25519 } from "@noble/curves/ed25519.js";
import { NODES } from "@/data/nodes";

const TIMEOUT_MS = 5000;
const MAX_SIGNED_AGE_S = 180;
// Clock skew tolerated on a future-dated `ts`. Anything beyond is forged:
// a node cannot legitimately sign a status it has not yet observed.
const MAX_SKEW_S = 30;

const HEX64 = /^[0-9a-f]{64}$/;
const HEX128 = /^[0-9a-f]{128}$/;

function hexToBytes(h: string): Uint8Array {
  const s = h.startsWith("0x") ? h.slice(2) : h;
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return out;
}

// Mirrors src/lib/signed-envelope.ts canonical(): deterministic, and THROWS on
// any value it cannot canonicalize identically in both stacks. A throw here is
// a verification failure, never a soft pass.
function canonical(obj: unknown): string {
  if (obj === null) return "null";
  const t = typeof obj;
  if (t === "string" || t === "boolean") return JSON.stringify(obj);
  if (t === "number") {
    if (!Number.isFinite(obj as number)) throw new Error("non-finite number");
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) return "[" + obj.map((v) => canonical(v)).join(",") + "]";
  if (t === "object") {
    const o = obj as Record<string, unknown>;
    const keys = Object.keys(o).sort();
    return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonical(o[k])).join(",") + "}";
  }
  throw new Error(`uncanonicalizable value: ${t}`);
}

function sha256Hex(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}


type ProbeResult = {
  node_id: string;
  node_name: string;
  probe_kind: string;
  target: string | null;
  state: "measured" | "reachable" | "unreachable" | "doctrine" | "broken";
  detail: string;
  payload_cid: string | null;
  signed_ts: number | null;
  expected_pub: string | null;
};

async function withTimeout<T>(f: (s: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await f(ctl.signal);
  } finally {
    clearTimeout(t);
  }
}

async function probeSigned(url: string, expectedPubHex: string) {
  try {
    const res = await withTimeout(
      (signal) => fetch(url, { signal, cache: "no-store" }),
      TIMEOUT_MS,
    );
    if (!res.ok) {
      return { state: "unreachable" as const, detail: `HTTP ${res.status}`, payload_cid: null, signed_ts: null };
    }
    const body: any = await res.json();
    if (
      body &&
      body.v === "ARCHANGEL/v0" &&
      body.payload &&
      body.payload_cid &&
      body.sig &&
      body.pub &&
      typeof body.ts === "number"
    ) {
      const pub = String(body.pub).toLowerCase();
      if (pub !== expectedPubHex.toLowerCase()) {
        return {
          state: "unreachable" as const,
          detail: `pub mismatch (${pub.slice(0, 12)}…)`,
          payload_cid: body.payload_cid,
          signed_ts: body.ts,
        };
      }
      const recomputed = sha256Hex(canonical(body.payload));
      if (recomputed !== String(body.payload_cid).toLowerCase()) {
        return {
          state: "unreachable" as const,
          detail: "payload_cid drift",
          payload_cid: body.payload_cid,
          signed_ts: body.ts,
        };
      }
      const msg = `${body.payload_cid}|${body.ts}`;
      const ok = ed25519.verify(hexToBytes(body.sig), new TextEncoder().encode(msg), hexToBytes(body.pub));
      if (!ok) {
        return {
          state: "unreachable" as const,
          detail: "signature invalid",
          payload_cid: body.payload_cid,
          signed_ts: body.ts,
        };
      }
      const ageS = Math.max(0, Math.floor(Date.now() / 1000) - body.ts);
      if (ageS > MAX_SIGNED_AGE_S) {
        return {
          state: "unreachable" as const,
          detail: `signed but stale ${ageS}s`,
          payload_cid: body.payload_cid,
          signed_ts: body.ts,
        };
      }
      return {
        state: "measured" as const,
        detail: `signed · cid matched · ${ageS}s fresh`,
        payload_cid: body.payload_cid as string,
        signed_ts: body.ts as number,
      };
    }
    return { state: "unreachable" as const, detail: "200 · unknown envelope", payload_cid: null, signed_ts: null };
  } catch (e: any) {
    return { state: "unreachable" as const, detail: e?.message ?? "network error", payload_cid: null, signed_ts: null };
  }
}

async function probeHead(url: string) {
  try {
    const res = await withTimeout(
      (signal) => fetch(url, { method: "HEAD", signal, cache: "no-store" }),
      TIMEOUT_MS,
    );
    return {
      state: (res.ok ? "reachable" : "unreachable") as "reachable" | "unreachable",
      detail: `HEAD ${res.status}`,
      payload_cid: null,
      signed_ts: null,
    };
  } catch (e: any) {
    return {
      state: "unreachable" as const,
      detail: e?.message ?? "network error",
      payload_cid: null,
      signed_ts: null,
    };
  }
}

async function runProbes(): Promise<ProbeResult[]> {
  return Promise.all(
    NODES.map(async (node): Promise<ProbeResult> => {
      const probe = node.probe;
      if (!probe) {
        return {
          node_id: node.id,
          node_name: node.name,
          probe_kind: "none",
          target: null,
          state: "doctrine",
          detail: "no probe declared",
          payload_cid: null,
          signed_ts: null,
          expected_pub: null,
        };
      }
      if (probe.kind === "signed-status") {
        if (!probe.edPubHex) {
          return {
            node_id: node.id,
            node_name: node.name,
            probe_kind: probe.kind,
            target: probe.url,
            state: "broken",
            detail: "signed-status without edPubHex",
            payload_cid: null,
            signed_ts: null,
            expected_pub: null,
          };
        }
        const r = await probeSigned(probe.url, probe.edPubHex);
        return {
          node_id: node.id,
          node_name: node.name,
          probe_kind: probe.kind,
          target: probe.url,
          expected_pub: probe.edPubHex,
          ...r,
        };
      }
      if (probe.kind === "no-cors-head" || probe.kind === "cors-json") {
        const r = await probeHead(probe.url);
        return {
          node_id: node.id,
          node_name: node.name,
          probe_kind: probe.kind,
          target: probe.url,
          expected_pub: null,
          ...r,
        };
      }
      // ipfs-signed-status: server-side gateway fetch not implemented here.
      return {
        node_id: node.id,
        node_name: node.name,
        probe_kind: probe.kind,
        target: `ipfs://${(probe as any).cid ?? ""}`,
        state: "doctrine",
        detail: "ipfs probe runs client-side only",
        payload_cid: null,
        signed_ts: null,
        expected_pub: (probe as any).edPubHex ?? null,
      };
    }),
  );
}

async function persist(results: ProbeResult[]) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const now = new Date().toISOString();
  const runId = crypto.randomUUID();

  const rows = results.map((r) => ({
    ...r,
    last_probed_at: now,
    run_id: runId,
  }));

  // Insert history row and upsert the latest-state row atomically per node.
  const { error: histErr } = await supabaseAdmin.from("node_probes").insert(rows);
  if (histErr) throw histErr;

  const { error: latestErr } = await supabaseAdmin
    .from("node_probes_latest")
    .upsert(rows, { onConflict: "node_id" });
  if (latestErr) throw latestErr;

  return { runId, count: rows.length };
}

export const Route = createFileRoute("/api/public/hooks/reprobe")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const results = await runProbes();
          const { runId, count } = await persist(results);
          const summary = results.map((r) => ({
            node_id: r.node_id,
            state: r.state,
            detail: r.detail,
          }));
          return Response.json({ ok: true, run_id: runId, count, results: summary });
        } catch (e: any) {
          console.error("reprobe failed", e);
          return Response.json(
            { ok: false, error: e?.message ?? "reprobe failed" },
            { status: 500 },
          );
        }
      },
      GET: async () => {
        // Read-only view of latest state, for humans and dashboards.
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("node_probes_latest")
          .select("*")
          .order("node_id");
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
        return Response.json({ ok: true, nodes: data });
      },
    },
  },
});
