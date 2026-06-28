// ARCHANGEL/v0 — shared TypeScript types + canonicalizer.
// Single source of truth lives in ../spec/archangel.v0.json.
// Mirrored in ../go/protocol.go. Golden vectors in ../spec/golden-vectors.json
// enforce byte-identical output across both stacks.

export const ARCHANGEL_VERSION = "ARCHANGEL/v0" as const;

/** TTL ceiling for the stateless (browser) verifier. */
export const STATELESS_TTL_SECONDS = 120;

export type WgBlock = {
  iface: string;
  peers: number;
  last_handshake_max_age_s: number;
};

export type Socks5Block = {
  listen: string;
  active_conns: number;
};

export type DnsBlock = {
  zone: string;
  records: number;
};

/** Status payload BEFORE the signature is attached. Input to canonicalize(). */
export type StatusPayload = {
  ts: number;
  wg: WgBlock;
  socks5: Socks5Block;
  dns: DnsBlock;
};

/** Status object as it travels on the wire. sig_ed25519 is lowercase hex of 64 bytes. */
export type SignedStatus = StatusPayload & { sig_ed25519: string };

/**
 * Produce the exact byte string the daemon signs and the verifier checks.
 * Sorted keys, no whitespace, sig_ed25519 omitted. v0 has no floats — every
 * numeric field is an integer.
 *
 * The shape is hand-rolled (rather than a generic sort) so any future field
 * addition is a deliberate edit here AND in ../go/protocol.go, not an accident
 * of object-key insertion order.
 */
export function canonicalize(p: StatusPayload): string {
  return JSON.stringify({
    dns: { records: p.dns.records, zone: p.dns.zone },
    socks5: { active_conns: p.socks5.active_conns, listen: p.socks5.listen },
    ts: p.ts,
    wg: {
      iface: p.wg.iface,
      last_handshake_max_age_s: p.wg.last_handshake_max_age_s,
      peers: p.wg.peers,
    },
  });
}

/**
 * Split a wire-format SignedStatus into (canonical bytes string, sig hex).
 * Throws if the input is missing required fields. Callers MUST treat any
 * thrown error as UNVERIFIED — never as a soft-pass.
 */
export function splitSigned(body: SignedStatus): { canonical: string; sig: string } {
  if (!body || typeof body !== "object") {
    throw new Error("ARCHANGEL/v0: body is not an object");
  }
  const { sig_ed25519, ...rest } = body;
  if (typeof sig_ed25519 !== "string" || !/^[0-9a-f]{128}$/.test(sig_ed25519)) {
    throw new Error("ARCHANGEL/v0: sig_ed25519 missing or malformed");
  }
  return { canonical: canonicalize(rest), sig: sig_ed25519 };
}

/**
 * Stateless freshness check. Returns true only if `ts` is within
 * STATELESS_TTL_SECONDS of `nowSec`. Verifier MUST call this AFTER signature
 * verification, not as a substitute for it.
 */
export function isFresh(tsSec: number, nowSec: number = Math.floor(Date.now() / 1000)): boolean {
  if (!Number.isFinite(tsSec)) return false;
  const age = nowSec - tsSec;
  return age >= 0 && age <= STATELESS_TTL_SECONDS;
}
