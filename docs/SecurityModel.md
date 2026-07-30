---
title: Security Model
---

# Security Model

This document expands `SECURITY.md` with the reasoning behind each control.
`SECURITY.md` is the policy; this is the rationale.

## 1. The browser is a verifier, never an authority

Nothing rendered green is believed because a server said so. Each green state is
the output of a local computation over bytes the operator's browser fetched.
Consequences:

- Verification code must be small, readable, and centralized. It is:
  `src/lib/signed-envelope.ts`.
- Every consumer (`probe-signed.ts`, `probe-ipfs.ts`, the server `reprobe` hook)
  delegates to it rather than reimplementing checks.

## 2. Fail closed, always

Default state is `UNVERIFIED` on every render. Only an explicit boolean `true`
from the verifier flips it. A thrown exception is a failure, not a skip.

## 3. Sign over bytes, not over objects

Signature verification happens over the raw response body. Parsing first would
let a permissive parser (duplicate keys, numeric coercion, BOM handling) create
a gap between "what was signed" and "what is displayed".

## 4. Canonicalization is strict

`canonical()`:

- sorts object keys deterministically,
- throws on `NaN`, `Infinity`, and `-0` ambiguity,
- throws on values that cannot be canonicalized rather than coercing them.

A throw is safe (⇒ `UNVERIFIED`); a silent coercion is not.

## 5. Freshness

| Control | Value | Reason |
| --- | --- | --- |
| TTL | ≤120s | Bounds replay of a genuinely signed payload. |
| Future skew | ≤30s | A node claiming the future is misconfigured or lying. |
| Counter | opaque string until after verify | Prevents type-confusion before the signature is trusted. |
| Counter monotonicity | enforced aggregator-side | Detects rollback across probes. |

## 6. Key management

- Ed25519 keypairs are generated **on the node**. Only the public half is
  published; pinned pubkeys live in `src/data/nodes.ts`.
- There is no key escrow, recovery service, or upload path. Losing a node key
  means reissuing the node identity — that is the intended cost.
- No private key material may enter this repository. See `SECURITY.md`.

## 7. Secret handling

- Server secrets are read inside handlers, never at module scope (the Worker
  runtime injects env per request).
- Webhook secrets are write-only through the Data API: column privileges revoke
  `SELECT`/`UPDATE` on `secret` from `authenticated`; `service_role` signs
  outbound payloads.
- Inbound webhooks verify signatures before touching the payload.
- `VITE_*` values are public by definition and treated as such.

## 8. Anchoring

OpenTimestamps + Bitcoin proves **existence at a time**. It does not prove that
the anchored content is correct, complete, or endorsed. The UI states anchor
depth and block height and nothing stronger.

## 9. On-chain surface

`TruthCoin` is soulbound and uses two-step ownership transfer, so a mistyped
address cannot orphan the contract. Production ownership target is a 2-of-3 Safe
on Base. The 48h time-lock is **declared, not enforced**; the UI says so.

## 10. Telemetry

Three modes, default **OFF**. `LOCAL` writes to IndexedDB only. `POSTHOG` is the
only mode that emits packets and is opt-in per operator.

## Residual risks (accepted, documented)

- A compromised build host can serve modified frontend code to a first-time
  visitor. Mitigation is out-of-band: pin and load the IPFS build, compare CIDs.
- OpenTimestamps calendars can be unavailable; anchors then sit `PENDING`. This
  is displayed, not hidden.
- A node operator can sign truthful-looking but semantically wrong data. The
  mesh proves authorship and freshness, not honesty.
