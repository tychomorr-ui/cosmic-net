# @cosmic-net/protocol

Single source of truth for the **ARCHANGEL/v0** wire contract used by:

- the in-browser control plane (`src/lib/protocol/` — re-exports `packages/protocol/ts`)
- the `archangel` Go daemon (`node-daemon/internal/protocol/` — mirrors `packages/protocol/go`)

## Layout

```
packages/protocol/
  spec/
    archangel.v0.json     # frozen wire contract + canonicalization rules
    golden-vectors.json   # byte-identical canonicalization fixtures
  ts/
    index.ts              # TS types + canonicalize() + golden runner
  go/
    protocol.go           # Go types + canonicalize() + golden runner
```

## Non-negotiable rules

1. Private key generated only on the node. Only the public half leaves.
2. Verifier defaults to `UNVERIFIED` every render cycle. Only an explicit `true` transitions out. Any thrown exception ⇒ `UNVERIFIED`.
3. Verifier signs over the raw response bytes of the canonicalized payload, before any re-serialization.
4. Numeric fields stay integers in v0 (no floats). `ts` is treated as opaque until after verify on the browser side (we never feed it to `Number()` pre-verify).
5. Stateless verifier ⇒ tight TTL (≤120s on `ts`). Aggregator ⇒ counter monotonicity (M3+).

## Canonicalization

Sorted keys, no whitespace, `sig_ed25519` stripped before signing, JSON.stringify default number formatting:

```text
{"dns":{"records":12,"zone":"xinus."},"socks5":{"active_conns":0,"listen":"10.42.0.1:1080"},"ts":1735689600,"wg":{"iface":"wg0","last_handshake_max_age_s":0,"peers":0}}
```

## Updating the spec

1. Bump the `version` field in `archangel.v0.json` (this is `v0`; a breaking change becomes `v1` in a new file).
2. Regenerate golden vectors.
3. Both stacks' golden tests must pass before merging.
