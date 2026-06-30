#!/usr/bin/env bun
// Idempotent signed-status sweep over every node in src/data/nodes.ts.
//
// For each node with a probe:
//   - signed-status → fetch /status, verify ed25519 sig + payload_cid against
//                     the declared expected pubkey
//   - no-cors-head  → HEAD probe; records REACHABLE/UNREACHABLE only
//   - (no probe)    → DOCTRINE · no surface, recorded once and skipped after
//
// Idempotency: for each node we look at the most recent
// PROBE.signed-status entry. If the new result's stable key (state +
// payload_cid for signed nodes, or state + HTTP status for opaque) matches
// the prior entry, no new row is appended. Re-running the sweep on a
// stable mesh is a no-op.
//
// Usage:  bun run scripts/probe-signed-all.mjs
//         bun run scripts/probe-signed-all.mjs --force   # always append

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";
import { ed25519 } from "@noble/curves/ed25519.js";

function hexToBytes(h) {
  const s = h.startsWith("0x") ? h.slice(2) : h;
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return out;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const NODES_PATH = resolve(ROOT, "src/data/nodes.ts");
const OPS_PATH = resolve(ROOT, "src/data/terminus-ops.json");

const FORCE = process.argv.includes("--force");
const TIMEOUT_MS = 5000;

// ---------- nodes.ts loader ----------
// nodes.ts is plain TS data with no runtime deps. We pull NODES via a Bun
// dynamic import (Bun executes TS natively). Falls back to a coarse regex
// only if the import fails for an unexpected reason.

async function loadNodes() {
  const mod = await import(NODES_PATH);
  if (!Array.isArray(mod.NODES)) throw new Error("NODES export missing");
  return mod.NODES;
}

// ---------- canonical JSON (matches probe-signed.ts) ----------

function canonical(obj) {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) return JSON.stringify(obj);
  const keys = Object.keys(obj).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonical(obj[k])).join(",") + "}";
}

function sha256Hex(s) {
  return createHash("sha256").update(s).digest("hex");
}

// ---------- probes ----------

async function withTimeout(p, ms) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await p(ctl.signal);
  } finally {
    clearTimeout(t);
  }
}

async function probeSigned(url, expectedPubHex) {
  try {
    const res = await withTimeout(
      (signal) => fetch(url, { signal, cache: "no-store" }),
      TIMEOUT_MS,
    );
    if (!res.ok) return { state: "unreachable", detail: `HTTP ${res.status}` };
    const body = await res.json();

    // Reference envelope (signed-status-server.py shape).
    if (body && body.v === "ARCHANGEL/v0" && body.payload && body.payload_cid && body.sig && body.pub) {
      if (String(body.pub).toLowerCase() !== expectedPubHex.toLowerCase()) {
        return {
          state: "reachable",
          detail: `pub mismatch (${String(body.pub).slice(0, 12)}…)`,
          payload_cid: body.payload_cid,
        };
      }
      const recomputed = sha256Hex(canonical(body.payload));
      if (recomputed !== String(body.payload_cid).toLowerCase()) {
        return { state: "reachable", detail: "payload_cid drift", payload_cid: body.payload_cid };
      }
      const msg = `${body.payload_cid}|${body.ts}`;
      const ok = ed25519.verify(hexToBytes(body.sig), new TextEncoder().encode(msg), hexToBytes(body.pub));
      if (!ok) return { state: "reachable", detail: "signature invalid", payload_cid: body.payload_cid };
      const ageS = Math.max(0, Math.floor(Date.now() / 1000) - body.ts);
      if (ageS > 180) return { state: "reachable", detail: `signed but stale ${ageS}s`, payload_cid: body.payload_cid };
      return {
        state: "measured",
        detail: `signed · cid matched · ${ageS}s fresh`,
        payload_cid: body.payload_cid,
        ts: body.ts,
      };
    }

    return { state: "reachable", detail: "200 · unknown envelope shape" };
  } catch (e) {
    return { state: "unreachable", detail: e?.message ?? "network error" };
  }
}

async function probeHead(url) {
  try {
    const res = await withTimeout(
      (signal) => fetch(url, { method: "HEAD", signal, cache: "no-store" }),
      TIMEOUT_MS,
    );
    return { state: "reachable", detail: `HEAD ${res.status}` };
  } catch (e) {
    return { state: "unreachable", detail: e?.message ?? "network error" };
  }
}

// ---------- idempotency ----------

function lastProbeFor(ops, nodeId) {
  for (const e of ops) {
    if (e.subsystem === "PROBE" && e.command === `signed-status:${nodeId}`) return e;
  }
  return null;
}

function stableKey(result) {
  // The fingerprint that determines "is this row the same fact as before".
  if (result.payload_cid) return `${result.state}:${result.payload_cid}`;
  return `${result.state}:${result.detail}`;
}

// ---------- main ----------

async function main() {
  const NODES = await loadNodes();
  const opsRaw = await readFile(OPS_PATH, "utf8");
  const ops = JSON.parse(opsRaw);

  const ts = new Date().toISOString();
  const sessionId = `probe-signed-${ts.slice(0, 19).replace(/[:T]/g, "-")}`;
  const newEntries = [];
  const summary = [];

  for (const node of NODES) {
    const probe = node.probe;
    let result;
    if (!probe) {
      result = { state: "doctrine", detail: "no probe declared" };
    } else if (probe.kind === "signed-status") {
      if (!probe.edPubHex) {
        result = { state: "broken", detail: "signed-status declared without edPubHex" };
      } else {
        result = await probeSigned(probe.url, probe.edPubHex);
      }
    } else {
      result = await probeHead(probe.url);
    }

    const prior = lastProbeFor(ops, node.id);
    const key = stableKey(result);
    const priorKey = prior ? prior.__key ?? extractKey(prior.result) : null;
    const changed = FORCE || !prior || priorKey !== key;

    summary.push({
      id: node.id,
      state: result.state,
      detail: result.detail,
      changed,
    });

    if (!changed) continue;

    const lines = [
      `SIGNED-STATUS PROBE · ${node.name} (${node.id})`,
      `kind: ${probe?.kind ?? "none"}`,
      `url: ${probe?.url ?? "—"}`,
      `state: ${result.state.toUpperCase()}`,
      `detail: ${result.detail}`,
    ];
    if (result.payload_cid) lines.push(`payload_cid: ${result.payload_cid}`);
    if (probe?.edPubHex) lines.push(`expected_pub: ${probe.edPubHex}`);
    lines.push(`stable_key: ${key}`);

    newEntries.push({
      ts,
      level: result.state === "measured" ? "INFO" : result.state === "unreachable" ? "WARN" : "INFO",
      subsystem: "PROBE",
      command: `signed-status:${node.id}`,
      result: lines.join("\n"),
      sessionId,
    });
  }

  if (newEntries.length === 0) {
    console.log(`No changes. ${summary.length} nodes probed; mesh stable.`);
    for (const s of summary) console.log(`  ${s.id.padEnd(24)} ${s.state.padEnd(11)} ${s.detail}`);
    return;
  }

  const next = [...newEntries.reverse(), ...ops];
  await writeFile(OPS_PATH, JSON.stringify(next, null, 2) + "\n", "utf8");
  console.log(`Appended ${newEntries.length} new probe entries to terminus-ops.json.`);
  for (const s of summary) {
    const tag = s.changed ? "+" : "·";
    console.log(`  ${tag} ${s.id.padEnd(24)} ${s.state.padEnd(11)} ${s.detail}`);
  }
}

// Pull the stable_key line back out of a prior PROBE result, so we don't
// have to extend the OpsEntry schema with a side-channel field.
function extractKey(resultText) {
  const m = String(resultText).match(/^stable_key:\s*(\S+)/m);
  return m ? m[1] : null;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
