# Sherlock Engagement Checklist

Public, verifiable status of everything a reviewer needs. Nothing here is a
claim of certification — the independent audit is **pending**.

## 1. Artifact integrity

| Item | Status |
| --- | --- |
| Bundle v1 `8f21bb6e…09a30` frozen | ✅ |
| Bundle v1 anchored — BTC block 959472 | ✅ |
| Bundle v2 `cdd91224…0db2f5` generated reproducibly | ✅ |
| Bundle v2 submitted to alice/bob/finney calendars | ✅ |
| Bundle v2 block height pinned (`ots upgrade`) | ⏳ pending inclusion |
| Transmittals published (v1, v2) | ✅ |

## 2. Repository readiness

| Item | Status |
| --- | --- |
| Public GitHub repository | ✅ |
| `README.md` with verify-it-yourself steps | ✅ |
| `SECURITY.md`, `CONTRIBUTING.md`, `LICENSE` (MIT) | ✅ |
| `docs/Architecture.md`, `SecurityModel.md`, `Governance.md` | ✅ |
| `docs/AuditScope.md` covers v1 + v2 | ✅ |
| CI verification workflow (`.github/workflows/verify.yml`) | ✅ |
| Tagged releases with attached bundle assets | ⏳ tag on push |

## 3. Contract state

| Item | Status |
| --- | --- |
| 56/56 hardened contract tests pass | ✅ |
| Preflight checks pass | ✅ |
| Two-step ownership, no renounce | ✅ |
| Real M-of-N multisig gate (no placeholder) | ✅ |
| Rate-limit units corrected | ✅ |
| Homoglyph normalization in registry | ✅ |
| 48h `TRC_TIMELOCK` declared in governance data | ✅ |
| Base **Sepolia** deployment `0x85b1C3c3…0b78` | ✅ |
| Base **mainnet** deployment | ⛔ blocked — see §4 |

## 4. External blockers before mainnet

1. **Safe multisig on Base** (2-of-3) not yet created — required signer set and
   address must be injected into `src/data/trc-governance.ts`.
2. **Audit not yet commissioned** — submission packet is ready to send.
3. Audit report received, findings triaged, remediations re-stamped as v3.

## 5. Reviewer quick start

```bash
git clone <repo> && cd <repo>
sha256sum docs/truthcoin-audit-bundle.txt docs/truthcoin-audit-bundle-v2.txt
ots verify docs/truthcoin-audit-bundle.ots
cd contracts && npm ci && npm test && npm run preflight
```

Scope, invariants, and out-of-scope boundaries: [`AuditScope.md`](./AuditScope.md),
[`AUDIT-TRANSMITTAL-v2.md`](./AUDIT-TRANSMITTAL-v2.md).
