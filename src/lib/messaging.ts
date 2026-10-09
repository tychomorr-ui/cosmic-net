// Sovereign two-peer messaging layer. Extends — does not touch — the Truth
// Ledger, CID code, or attestation. All key material and queues live in
// IndexedDB only. No third-party services; the only network call is to the
// peer_address the operator typed.

import { ed25519 } from "@noble/curves/ed25519.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";
import { createStore, get, set } from "idb-keyval";
import { canonicalize, valueToCid } from "@/lib/cid";

export const CHANNEL_NAME = "nexinus-messaging-v1";
export const MAX_BODY = 4096;
export const MAX_ATTEMPTS = 20;

export type MsgType = "message" | "ack" | "ping";
export type MsgState =
  | "draft" | "signed" | "sent-local" | "sent-overlay" | "queued-retry"
  | "delivered" | "acked" | "rejected" | "failed";

export type MsgEnvelope = {
  msg_id: string;
  created_at: string;
  sender_peer_id: string;
  sender_pubkey: string; // declared ed25519 pubkey (hex) used for verification
  recipient_peer_id: string;
  body: string;
  prev_cid: string | null;
  in_reply_to: string | null;
  type: MsgType;
  sig: string;
  cid: string;
};

export type MsgRecord = {
  env: MsgEnvelope;
  state: MsgState;
  transport: "local" | "overlay";
  sig_valid: boolean | null;
  reason?: string;
  sent_at?: string;
  delivered_at?: string;
  acked_at?: string;
  attempts: number;
  next_retry_at?: number;
  read?: boolean;
};

export type PeerConfig = {
  my_peer_id: string;
  my_public_key: string;
  my_private_key: string;
  peer_address: string;
  peer_public_key: string;
};

const store = () => createStore("nexinus-messaging", "kv");
const K_CFG = "config.v1";
const K_OUT = "outbox.v1";
const K_IN = "inbox.v1";

const randHex = (n: number) => bytesToHex(crypto.getRandomValues(new Uint8Array(n)));

export async function loadConfig(): Promise<PeerConfig> {
  const c = (await get<PeerConfig>(K_CFG, store())) ?? null;
  if (c) return c;
  const fresh: PeerConfig = {
    my_peer_id: "operator-" + randHex(3),
    my_public_key: "", my_private_key: "", peer_address: "", peer_public_key: "",
  };
  await set(K_CFG, fresh, store());
  return fresh;
}
export const saveConfig = (c: PeerConfig) => set(K_CFG, c, store());
export const loadOutbox = async () => (await get<MsgRecord[]>(K_OUT, store())) ?? [];
export const loadInbox = async () => (await get<MsgRecord[]>(K_IN, store())) ?? [];
export const saveOutbox = (r: MsgRecord[]) => set(K_OUT, r, store());
export const saveInbox = (r: MsgRecord[]) => set(K_IN, r, store());

export function generateKeypair(): { pub: string; priv: string } {
  const priv = ed25519.utils.randomSecretKey();
  return { priv: bytesToHex(priv), pub: bytesToHex(ed25519.getPublicKey(priv)) };
}

type Unsigned = Omit<MsgEnvelope, "sig" | "cid">;

/** Canonical bytes = dag-json (sorted keys, UTF-8, no whitespace). */
const signingBytes = (u: Unsigned) => canonicalize(u);

export async function buildEnvelope(
  cfg: PeerConfig,
  input: { recipient: string; body: string; type: MsgType; in_reply_to?: string | null; prev_cid: string | null },
): Promise<MsgEnvelope> {
  if (!cfg.my_private_key) throw new Error("no keypair — generate one first");
  if (input.body.length > MAX_BODY) throw new Error(`body exceeds ${MAX_BODY} chars`);
  const u: Unsigned = {
    msg_id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    sender_peer_id: cfg.my_peer_id,
    sender_pubkey: cfg.my_public_key,
    recipient_peer_id: input.recipient,
    body: input.body,
    prev_cid: input.prev_cid,
    in_reply_to: input.in_reply_to ?? null,
    type: input.type,
  };
  const sig = bytesToHex(ed25519.sign(signingBytes(u), hexToBytes(cfg.my_private_key)));
  const cid = await valueToCid({ ...u, sig });
  return { ...u, sig, cid };
}

/** Verify sig + CID. If `pinnedPub` is set, sender_pubkey must match it. */
export async function verifyEnvelope(
  e: MsgEnvelope,
  pinnedPub?: string,
): Promise<{ ok: boolean; sigValid: boolean; reason?: string }> {
  try {
    if (!e || typeof e !== "object") return { ok: false, sigValid: false, reason: "malformed envelope" };
    if (pinnedPub && pinnedPub.toLowerCase() !== String(e.sender_pubkey).toLowerCase())
      return { ok: false, sigValid: false, reason: "sender key does not match pinned peer key" };
    const { sig, cid, ...u } = e;
    let sigValid = false;
    try {
      sigValid = ed25519.verify(hexToBytes(sig), signingBytes(u as Unsigned), hexToBytes(e.sender_pubkey));
    } catch { sigValid = false; }
    if (!sigValid) return { ok: false, sigValid, reason: "signature invalid" };
    const recomputed = await valueToCid({ ...u, sig });
    if (recomputed !== cid) return { ok: false, sigValid, reason: "CID mismatch" };
    return { ok: true, sigValid };
  } catch (err) {
    return { ok: false, sigValid: false, reason: (err as Error).message };
  }
}

export function backoffMs(attempts: number): number {
  return Math.min(30_000 * 2 ** Math.max(0, attempts - 1), 600_000);
}
