// Browser-side sovereign key material. Private keys never leave this device.
// x25519 = WireGuard peer key. ed25519 = operator identity for archangel handshake.

import { ed25519, x25519 } from "@noble/curves/ed25519.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";

const STORAGE_KEY = "nexinus.terminus.operator.v1";

export type OperatorKeys = {
  edPrivHex: string;
  edPubHex: string;
  xPrivBase64: string; // WireGuard format
  xPubBase64: string;  // WireGuard format
  createdAt: number;
};

function b64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

function b64ToBytes(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function generateOperatorKeys(): OperatorKeys {
  const edPriv = ed25519.utils.randomSecretKey();
  const edPub = ed25519.getPublicKey(edPriv);
  const xPriv = x25519.utils.randomSecretKey();
  const xPub = x25519.getPublicKey(xPriv);
  return {
    edPrivHex: bytesToHex(edPriv),
    edPubHex: bytesToHex(edPub),
    xPrivBase64: b64(xPriv),
    xPubBase64: b64(xPub),
    createdAt: Date.now(),
  };
}

export function loadOperatorKeys(): OperatorKeys | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OperatorKeys) : null;
  } catch {
    return null;
  }
}

export function saveOperatorKeys(k: OperatorKeys): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(k));
}

export function clearOperatorKeys(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

// ARCHANGEL/v0 enrollment signature.
// msg = "ARCHANGEL/v0\n" + nonceHex + "\n" + clientX25519PubHex
export function signEnrollment(
  keys: OperatorKeys,
  nonceHex: string,
): { msg: string; sigHex: string; xPubHex: string } {
  const xPubBytes = b64ToBytes(keys.xPubBase64);
  const xPubHex = bytesToHex(xPubBytes);
  const msg = `ARCHANGEL/v0\n${nonceHex}\n${xPubHex}`;
  const sig = ed25519.sign(utf8ToBytes(msg), hexToBytes(keys.edPrivHex));
  return { msg, sigHex: bytesToHex(sig), xPubHex };
}

// Verify a node's signed /status payload.
// payload is canonical JSON of the status object MINUS the sig_ed25519 field.
export function verifyNodeStatus(
  canonicalPayload: string,
  sigHex: string,
  nodeEdPubHex: string,
): boolean {
  try {
    return ed25519.verify(
      hexToBytes(sigHex),
      utf8ToBytes(canonicalPayload),
      hexToBytes(nodeEdPubHex),
    );
  } catch {
    return false;
  }
}

export function fingerprint(pubHex: string): string {
  const h = bytesToHex(sha256(hexToBytes(pubHex)));
  return `${h.slice(0, 8)} ${h.slice(8, 16)} ${h.slice(16, 24)} ${h.slice(24, 32)}`;
}
