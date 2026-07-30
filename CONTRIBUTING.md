# Contributing

NEXINUS / cMAP accepts contributions that make the system **more verifiable**.
Contributions that add trust assumptions, telemetry, or unverifiable claims are
rejected on principle, not on style.

## Ground rules

1. **No claim without evidence.** If the UI says something is verified, a
   deterministic in-browser check must prove it. Otherwise the honest state
   (`UNVERIFIED`, `PENDING`, `STANDBY`) must be shown.
2. **Fail closed.** Any thrown exception in a verification path resolves to
   `UNVERIFIED`, never to a green state.
3. **Zero telemetry by default.** Network egress must be opt-in and documented.
4. **Determinism.** Canonicalization, CID derivation, and manifest builds must
   produce byte-identical output across machines.
5. **Preserve taxonomy.** Use the canonical names in `src/lib/taxonomy.ts`.

## Local setup

```bash
bun install
bun run dev          # http://localhost:8080
bunx vitest run      # unit + contract tests
bun run lint
cd contracts && npm install && npm run preflight
```

Copy `template.env` to `.env` and fill in the values you need. Never commit
`.env`.

## Repository layout

See the "Repository layout" section of `README.md` and `docs/Architecture.md`.
Placement rules:

| Kind of code | Location |
| --- | --- |
| Pure logic, crypto, derivation, parsing | `src/lib/` |
| Server functions (typed RPC) | `src/utils/*.functions.ts` |
| Server-only helpers | `*.server.ts` |
| HTTP endpoints / webhooks | `src/routes/api/`, external callers under `src/routes/api/public/` |
| Presentation | `src/components/` |
| Static datasets and registries | `src/data/` |
| Operator scripts | `scripts/` |
| Contracts | `contracts/` |

Route files under `src/routes/` are required by TanStack Start's file-based
router. Do not edit `src/routeTree.gen.ts` — it is generated.

## Pull requests

- One concern per PR. Refactors and behaviour changes stay separate.
- Every exported function gets TSDoc explaining *why* it exists.
- No `any`, no implicit `any`, no `@ts-ignore` without a written justification.
- Tests are required for anything in a verification path.
- If a change alters protocol behaviour, re-run `scripts/substrate-snapshot.mjs`
  and note the new root in the PR description.

## Commit style

```
area: short imperative summary

Why this change exists, and what it deliberately does not do.
```

Areas: `verify`, `mesh`, `provenance`, `contracts`, `ui`, `docs`, `infra`.

## Security issues

Do not open a public issue. Follow `SECURITY.md`.
