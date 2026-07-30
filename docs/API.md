---
title: API
---

# API

Two distinct server surfaces. Internal app logic uses typed RPC; external
callers use HTTP routes.

## Typed RPC — server functions

Defined with `createServerFn` from `@tanstack/react-start`, in
`src/utils/*.functions.ts`. Called from components via `useServerFn`, never from
a public route loader when the function requires auth.

| Function module | Purpose |
| --- | --- |
| `src/utils/payments.functions.ts` | Checkout session creation, subscription state reads. |
| `src/utils/webhooks.functions.ts` | Provenance webhook registration. The signing secret is returned once at creation and is never readable afterwards. |

Rules:
- Secrets are read inside `.handler()`, never at module scope.
- Auth-protected functions use `.middleware([requireSupabaseAuth])` and run as
  the user, with RLS applied.

## HTTP routes

### `POST /api/public/hooks/reprobe`

Scheduled mesh re-verification, called by `pg_cron` job `reprobe-mesh-15m`.

- Auth: shared secret (`REPROBE_HOOK_SECRET`). Unauthenticated ⇒ `401`.
- Behaviour: fetches each node's `/status`, re-derives the payload CID,
  verifies the Ed25519 signature over raw bytes, enforces TTL and skew, then
  writes `node_probes` and upserts `node_probes_latest`.
- Response: per-node `{ node, state, reason }`. Never returns PII.

### `POST /api/public/payments/webhook`

Stripe webhook receiver.

- Auth: HMAC signature verified against `PAYMENTS_SANDBOX_WEBHOOK_SECRET`
  **before** the payload is parsed. Invalid ⇒ `401`.
- Behaviour: reconciles subscription state used by the MCP entitlement gate.

### `GET /sitemap.xml`, `GET /robots.txt`

Static discovery surfaces.

## MCP server

Endpoint: `/mcp` (tool list at `/.mcp/list-tools`, invocation at
`/.mcp/invoke-tool/$tool`). OAuth issuer is the direct Supabase auth host;
audience `authenticated`.

| Tool | Access | Returns |
| --- | --- | --- |
| `list_nodes` | subscriber | Sovereign node fleet and current verified state. |
| `list_blades` | subscriber | OMNI-SAM AXIS blade registry. |
| `centralization_inventory` | subscriber | Honest inventory of remaining centralized dependencies. |
| `provenance_record` | metered | Records a provenance entry. |
| `provenance_ots_stamp` | metered | Anchors a hash to Bitcoin via OpenTimestamps. |

Entitlement is enforced in `src/lib/mcp/subscription-gate.ts` against
`has_active_subscription` / `get_subscription_tier`. Monthly stamp volume is
bounded by `get_stamp_count_this_month`.

## Error posture

Verification endpoints fail closed and return the machine-readable reason
(`bad_signature`, `cid_mismatch`, `stale`, `future_skew`, `unreachable`).
Provider errors are surfaced with their upstream status and body rather than
being flattened to a generic `500`.
