import { describe, expect, it } from "vitest";
import { ed25519 } from "@noble/curves/ed25519.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";
import { canonicalize, valueToCid } from "./cid";
import {
  backoffMs, buildEnvelope, generateKeypair, MAX_ATTEMPTS, MAX_BODY,
  verifyEnvelope, verifyAck, retryPatch, type PeerConfig,
} from "./messaging";

const priv = "0".repeat(63) + "1";
const pub = bytesToHex(ed25519.getPublicKey(hexToBytes(priv)));
const cfg: PeerConfig = {
  my_peer_id: "sender", my_public_key: pub, my_private_key: priv,
  peer_address: "", peer_public_key: "",
};
const input = { recipient: "receiver", body: "signed message", type: "message" as const, prev_cid: null };

describe("sovereign messaging", () => {
  it("generates matching Ed25519 keys", () => {
    const keys = generateKeypair();
    expect(keys.pub).toBe(bytesToHex(ed25519.getPublicKey(hexToBytes(keys.priv))));
  });
  it("signs canonical unsigned bytes and fingerprints the signed envelope", async () => {
    const env = await buildEnvelope(cfg, input);
    const { sig, cid, ...unsigned } = env;
    expect(ed25519.verify(hexToBytes(sig), canonicalize(unsigned), hexToBytes(pub))).toBe(true);
    expect(cid).toBe(await valueToCid({ ...unsigned, sig }));
    expect(await verifyEnvelope(env, pub)).toEqual({ ok: true, sigValid: true });
  });
  it("canonicalizes nested keys independently of insertion order", () => {
    expect(canonicalize({ b: [{ z: 1, a: 2 }], a: "λ" })).toEqual(canonicalize({ a: "λ", b: [{ a: 2, z: 1 }] }));
  });
  it("rejects body tampering", async () => {
    const env = await buildEnvelope(cfg, input);
    expect(await verifyEnvelope({ ...env, body: "changed" })).toMatchObject({ ok: false, sigValid: false });
  });
  it("rejects CID tampering even when the signature is valid", async () => {
    const env = await buildEnvelope(cfg, input);
    expect(await verifyEnvelope({ ...env, cid: "wrong" })).toMatchObject({ ok: false, sigValid: true, reason: "CID mismatch" });
  });
  it("rejects an unpinned sender key", async () => {
    const env = await buildEnvelope(cfg, input);
    expect(await verifyEnvelope(env, "a".repeat(64))).toMatchObject({ ok: false, sigValid: false });
    expect((await verifyEnvelope(env, pub.toUpperCase())).ok).toBe(true);
  });
  it("fails closed on malformed signatures and envelopes", async () => {
    const env = await buildEnvelope(cfg, input);
    expect((await verifyEnvelope({ ...env, sig: "invalid" })).ok).toBe(false);
  });
  it("enforces the 4096 character body boundary", async () => {
    expect(MAX_BODY).toBe(4096);
    expect((await buildEnvelope(cfg, { ...input, body: "x".repeat(4096) })).body.length).toBe(4096);
    await expect(buildEnvelope(cfg, { ...input, body: "x".repeat(4097) })).rejects.toThrow("body exceeds 4096 chars");
  });
  it("refuses unsigned sends without private keys", async () => {
    await expect(buildEnvelope({ ...cfg, my_private_key: "" }, input)).rejects.toThrow("no keypair");
  });
  it("uses exponential retries starting at 30s and capped at 10 minutes", () => {
    expect([0, 1, 2, 3, 4, 5, 6, 20].map(backoffMs)).toEqual([30000, 30000, 60000, 120000, 240000, 480000, 600000, 600000]);
    expect(MAX_ATTEMPTS).toBe(20);
  });
  it("signs reply references and chain links", async () => {
    const first = await buildEnvelope(cfg, input);
    const ack = await buildEnvelope(cfg, { ...input, body: "", type: "ack", in_reply_to: first.msg_id, prev_cid: first.cid });
    expect((await verifyEnvelope(ack)).ok).toBe(true);
    expect((await verifyEnvelope({ ...ack, in_reply_to: "unrelated" })).ok).toBe(false);
    expect((await verifyEnvelope({ ...ack, prev_cid: null })).ok).toBe(false);
  });
  it("accepts only acknowledgments addressed by the intended peer", async () => {
    const sent = await buildEnvelope(cfg, input);
    const peer = { ...cfg, my_peer_id: "receiver" };
    const ackInput = { recipient: "sender", body: "", type: "ack" as const, in_reply_to: sent.msg_id, prev_cid: null };
    const ack = await buildEnvelope(peer, ackInput);
    expect(await verifyAck(ack, sent, pub)).toBe(true);
    expect(await verifyAck(await buildEnvelope({ ...peer, my_peer_id: "impostor" }, ackInput), sent, pub)).toBe(false);
    expect(await verifyAck(await buildEnvelope(peer, { ...ackInput, recipient: "other" }), sent, pub)).toBe(false);
    expect(await verifyAck(await buildEnvelope(peer, { ...ackInput, in_reply_to: "other" }), sent, pub)).toBe(false);
    expect(await verifyAck(ack, sent, "a".repeat(64))).toBe(false);
  });
  it("fails at attempt 20, otherwise schedules the next retry", () => {
    expect(retryPatch(19, "no ack", 1000)).toEqual({ state: "queued-retry", attempts: 19, reason: "no ack", next_retry_at: 601000 });
    expect(retryPatch(20, "no ack", 1000)).toEqual({ state: "failed", attempts: 20, reason: "no ack", next_retry_at: undefined });
  });
});