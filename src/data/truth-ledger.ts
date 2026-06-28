// Truth Ledger — append-only envelope chain for PAM · SOURCE&TRUTH.
//
// Every non-emergency lane pass produces an envelope:
//   { ts, lane, request, reflection, truths, next_move, drift, prev_cid, cid }
//
// Envelopes are chained by CIDv1 (dag-json, sha-256). The ledger is
// append-only; truths supersede, never silently overwrite. A new envelope
// must carry `prev_cid` equal to the head's `cid`, or the append is refused
// as a drift fault.

import { valueToCid } from "@/lib/cid";
import { kvGet, kvSet } from "@/lib/sovereign-store";

export const LANES = [
  "Core",
  "Expand",
  "Ascend",
  "Transcend",
  "Warrior",
  "Omni",
  "EMERGENCY",
] as const;
export type Lane = (typeof LANES)[number];

export type LedgerTruth = {
  id: string;          // short slug
  statement: string;   // declared truth
  declared_at: number; // ms
  supersedes?: string; // id of prior truth this replaces
};

export type Envelope = {
  v: "pam.envelope/v0";
  ts: number;
  lane: Lane;
  request: string;
  reflection: string;     // one line, mirror of request vs ledger
  truths: string[];       // truth ids touched, or ["unledgered"]
  next_move: string;      // exactly one concrete move
  drift: string | null;   // drift flag, if any
  prev_cid: string | null;
  cid: string;            // self-CID over the envelope minus `cid`
};

const TRUTH_KEY = "nexinus.pam.truths.v1";
const ENV_KEY = "nexinus.pam.envelopes.v1";

// ---------- truths (append-only, supersede semantics) ----------

export function loadTruths(): LedgerTruth[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(kvGet(TRUTH_KEY) ?? "[]") as LedgerTruth[];
  } catch {
    return [];
  }
}

export function saveTruths(t: LedgerTruth[]): void {
  if (typeof window === "undefined") return;
  kvSet(TRUTH_KEY, JSON.stringify(t));
}

export function activeTruths(): LedgerTruth[] {
  const all = loadTruths();
  const superseded = new Set(all.map((t) => t.supersedes).filter(Boolean) as string[]);
  return all.filter((t) => !superseded.has(t.id));
}

export function declareTruth(statement: string, supersedes?: string): LedgerTruth {
  const all = loadTruths();
  const id = `t-${all.length + 1}-${Math.random().toString(36).slice(2, 6)}`;
  const next: LedgerTruth = { id, statement, declared_at: Date.now(), supersedes };
  saveTruths([...all, next]);
  return next;
}

// ---------- envelopes (CID-chained) ----------

export function loadEnvelopes(): Envelope[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(kvGet(ENV_KEY) ?? "[]") as Envelope[];
  } catch {
    return [];
  }
}

function saveEnvelopes(e: Envelope[]): void {
  if (typeof window === "undefined") return;
  kvSet(ENV_KEY, JSON.stringify(e));
}

export function head(): Envelope | null {
  const all = loadEnvelopes();
  return all.length ? all[all.length - 1] : null;
}

export type AppendInput = {
  lane: Lane;
  request: string;
  reflection: string;
  truths: string[];
  next_move: string;
  drift?: string | null;
};

export async function appendEnvelope(input: AppendInput): Promise<Envelope> {
  // Invariants — fail closed.
  if (!input.request.trim()) throw new Error("request required");
  if (input.lane !== "EMERGENCY" && !input.reflection.trim())
    throw new Error("non-emergency lane requires reflection");
  if (!input.next_move.trim()) throw new Error("next_move required (exactly one)");
  if (input.next_move.split(/\r?\n/).filter((l) => l.trim()).length > 1)
    throw new Error("next_move must collapse to one line");

  const prev = head();
  const body = {
    v: "pam.envelope/v0" as const,
    ts: Date.now(),
    lane: input.lane,
    request: input.request,
    reflection: input.reflection,
    truths: input.truths.length ? input.truths : ["unledgered"],
    next_move: input.next_move,
    drift: input.drift ?? null,
    prev_cid: prev?.cid ?? null,
  };
  const cid = await valueToCid(body);
  const env: Envelope = { ...body, cid };
  saveEnvelopes([...loadEnvelopes(), env]);
  return env;
}

export async function verifyChain(): Promise<{ ok: boolean; breakAt?: number }> {
  const all = loadEnvelopes();
  let prev: string | null = null;
  for (let i = 0; i < all.length; i++) {
    const { cid, ...body } = all[i];
    if (body.prev_cid !== prev) return { ok: false, breakAt: i };
    const recomputed = await valueToCid(body);
    if (recomputed !== cid) return { ok: false, breakAt: i };
    prev = cid;
  }
  return { ok: true };
}
