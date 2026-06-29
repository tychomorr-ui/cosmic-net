// Pass 1 — Verifiability Audit.
//
// Each row is a UI surface mapped to the *evidence* that can prove it in
// the browser. Status is one of:
//   "provable"     — there is local code that recomputes the claim
//   "declared"     — the value is asserted but not cryptographically proven
//   "aspirational" — roadmap; surface MUST not imply present-tense truth
//
// This file is the source of truth for the audit panel. Edits here are
// reviewed against the cMAP doctrine; do NOT silently flip a row from
// "declared" to "provable" without adding the verifier.

export type AuditStatus = "provable" | "declared" | "aspirational";

export type AuditRow = {
  surface: string;       // where the claim shows up in the UI
  claim: string;         // the user-visible assertion
  evidence: string;      // what proves (or doesn't prove) it
  status: AuditStatus;
};

export const DOCTRINE_AUDIT: AuditRow[] = [
  {
    surface: "/ops · Manifest CID",
    claim: "Every ops entry is content-addressed (CIDv1 · dag-json · sha-256).",
    evidence: "src/lib/cid.ts recomputes CIDs from local bytes on mount.",
    status: "provable",
  },
  {
    surface: "/ops · monarch.xinus.one",
    claim: "Gateway is online and ed25519-signed.",
    evidence: "Signed payload returned by /health; signature verified browser-side.",
    status: "provable",
  },
  {
    surface: "/seventh-dimension · Resonate-Earth attestation",
    claim: "PISTIFUS-VALIDATED sigil when verification passes.",
    evidence: "src/lib/attestation.ts: HEAD reach + CID recompute, fail-closed.",
    status: "provable",
  },
  {
    surface: "/pam · Truth Ledger chain badge",
    claim: "Append-only CID-chained envelopes.",
    evidence: "src/data/truth-ledger.ts verifyChain() walks prev-CID links.",
    status: "provable",
  },
  {
    surface: "Footer / meta · 'zero telemetry'",
    claim: "No telemetry leaves the browser.",
    evidence: "PostHog client is currently active (us.i.posthog.com). Claim is FALSE until Pass 4.",
    status: "declared",
  },
  {
    surface: "README · 'local-first witness'",
    claim: "App state lives in the browser.",
    evidence: "Truth Chain + Truth Ledger persist to localStorage; no server write path.",
    status: "provable",
  },
  {
    surface: "Header · 'sovereign infrastructure'",
    claim: "App is infrastructure-independent.",
    evidence: "Bundle is currently served by a Cloudflare Worker. IPFS distribution lands in Pass 3.",
    status: "aspirational",
  },
  {
    surface: "valkyrie.nexinus.net probe",
    claim: "Reachable as a declared gateway.",
    evidence: "Network log: HEAD currently fails (TypeError: Failed to fetch). Surface as UNREACHABLE.",
    status: "declared",
  },
  {
    surface: "resonate-earth.live probe",
    claim: "Reachable as a sovereign node.",
    evidence: "Opaque HEAD returns status 0 (no-cors). Reach proven, body unverifiable.",
    status: "declared",
  },
  {
    surface: "Truth Coin / SUDO-Coin labels",
    claim: "Coin substrate.",
    evidence: "src/lib/btc-substrate.ts reads live BTC headers; no minting, no token.",
    status: "provable",
  },
];

export function auditTally() {
  const t = { provable: 0, declared: 0, aspirational: 0 };
  for (const r of DOCTRINE_AUDIT) t[r.status]++;
  return t;
}
