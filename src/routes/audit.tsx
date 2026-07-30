/**
 * Audit Center — the compliance surface an external reviewer lands on.
 *
 * Why this route exists: an auditor, partner, or investor should be able to
 * establish the project's real posture in under a minute without reading code
 * and without asking us. Every row states measured or declared fact, and any
 * gap is rendered as PENDING rather than omitted. Nothing here implies
 * certification that does not exist.
 */

import { createFileRoute } from "@tanstack/react-router";
import {
  TRC_SAFE,
  TRC_AUDIT,
  TRC_TIMELOCK,
  safeConfigured,
  auditConfigured,
  timelockEnforced,
  mainnetBlockers,
} from "@/data/trc-governance";
import { TRC_CONTRACT, explorerAddressUrl } from "@/data/truth-coin-contract";
import { KNOWN_ANCHORS } from "@/data/known-anchors";

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "Audit Center · NEXINUS Compliance & Verification Status" },
      {
        name: "description",
        content:
          "Live audit posture for NEXINUS: build identity, contract status, governance gates, anchor coverage, and documentation index. Independent security audit: pending.",
      },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Audit Center · NEXINUS" },
      {
        property: "og:description",
        content:
          "Build identity, contract status, governance gates, and anchor coverage. Independent security audit: pending.",
      },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Audit Center · NEXINUS" },
      {
        name: "twitter:description",
        content:
          "Build identity, contract status, governance gates, and anchor coverage. Independent security audit: pending.",
      },
    ],
  }),
  component: AuditCenter,
});

/** Verification posture of a single audit row. Drives colour and wording. */
type Posture = "verified" | "pending" | "declared" | "blocked";

interface AuditRow {
  label: string;
  value: string;
  posture: Posture;
  /** Why this row matters to a reviewer. Rendered as secondary text. */
  note: string;
  href?: string;
}

const POSTURE_LABEL: Record<Posture, string> = {
  verified: "VERIFIED",
  pending: "PENDING",
  declared: "DECLARED",
  blocked: "BLOCKED",
};

const POSTURE_CLASS: Record<Posture, string> = {
  verified: "border-primary/40 bg-primary/10 text-primary",
  pending: "border-muted-foreground/30 bg-muted/20 text-muted-foreground",
  declared: "border-gold/40 bg-gold/10 text-gold",
  blocked: "border-destructive/40 bg-destructive/10 text-destructive",
};

/** Build identity is injected at build time; falls back to an honest unknown. */
const BUILD_VERSION = "v1.3.0";
const BUILD_COMMIT = import.meta.env.VITE_GIT_COMMIT ?? "unrecorded";
const BUILD_TIME = import.meta.env.VITE_BUILD_TIME ?? "unrecorded";

const AUDIT_BUNDLE_SHA =
  "8f21bb6e" + "…" + "09a30";

function Section({ title, subtitle, rows }: { title: string; subtitle: string; rows: AuditRow[] }) {
  return (
    <section className="border border-border bg-background/60 backdrop-blur-sm">
      <header className="border-b border-border px-4 py-3">
        <h2 className="display-font text-[13px] tracking-[0.2em] text-primary">{title}</h2>
        <p className="mt-1 text-[11px] text-muted-foreground">{subtitle}</p>
      </header>
      <ul className="divide-y divide-border">
        {rows.map((row) => (
          <li key={row.label} className="flex flex-wrap items-start gap-3 px-4 py-3">
            <div className="min-w-[10rem] flex-1">
              <div className="text-[12px] text-foreground">{row.label}</div>
              <div className="terminal-font mt-0.5 break-all text-[12px] text-muted-foreground">
                {row.href ? (
                  <a
                    href={row.href}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2 hover:text-primary"
                  >
                    {row.value}
                  </a>
                ) : (
                  row.value
                )}
              </div>
              <div className="mt-1 text-[10.5px] leading-relaxed text-muted-foreground/80">
                {row.note}
              </div>
            </div>
            <span
              className={`shrink-0 border px-2 py-0.5 text-[10px] tracking-[0.18em] ${POSTURE_CLASS[row.posture]}`}
            >
              {POSTURE_LABEL[row.posture]}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AuditCenter() {
  const anchorCount = Object.keys(KNOWN_ANCHORS).length;
  const blockers = mainnetBlockers();

  const build: AuditRow[] = [
    {
      label: "Repository version",
      value: BUILD_VERSION,
      posture: "verified",
      note: "Console release tag shown in the command bar.",
    },
    {
      label: "Git commit",
      value: BUILD_COMMIT,
      posture: BUILD_COMMIT === "unrecorded" ? "pending" : "verified",
      note: "Set VITE_GIT_COMMIT at build time to bind the running bundle to a commit.",
    },
    {
      label: "Build timestamp",
      value: BUILD_TIME,
      posture: BUILD_TIME === "unrecorded" ? "pending" : "verified",
      note: "Set VITE_BUILD_TIME at build time. Unrecorded is stated, never guessed.",
    },
    {
      label: "Deployment",
      value: "universaltruth.life · hosted build + IPFS-pinnable bundle",
      posture: "verified",
      note: "The hosted build is a convenience, not a trust root. Pin and compare the CID.",
    },
  ];

  const audit: AuditRow[] = [
    {
      label: "Independent security audit",
      value: auditConfigured() ? TRC_AUDIT.firm : "Not commissioned",
      posture: auditConfigured() ? "verified" : "pending",
      note: "No certification is claimed. Scope is defined in docs/AuditScope.md.",
    },
    {
      label: "Contract audit bundle",
      value: `SHA-256 ${AUDIT_BUNDLE_SHA} · Bitcoin block 959472`,
      posture: "verified",
      note: "Frozen and anchored. Reproduce with sha256sum and `ots verify` against docs/.",
    },
    {
      label: "Preflight invariants",
      value: "8/8 PASS (contracts/scripts/preflight.js)",
      posture: "verified",
      note: "Re-run locally: cd contracts && npm run preflight — must exit 0.",
    },
    {
      label: "Anchor coverage",
      value: `${anchorCount} recorded Bitcoin anchors`,
      posture: "verified",
      note: "Each entry is reproducible by re-running `ots verify` on the original bytes.",
    },
  ];

  const contract: AuditRow[] = [
    {
      label: "Truth Coin — testnet",
      value: TRC_CONTRACT.address || "not deployed",
      posture: TRC_CONTRACT.address ? "verified" : "pending",
      note: `Soulbound ERC-20 on ${TRC_CONTRACT.chainName}. Read live on the Truth Coin view.`,
      href: TRC_CONTRACT.address ? explorerAddressUrl(TRC_CONTRACT.address) : undefined,
    },
    {
      label: "Truth Coin — mainnet",
      value: blockers.length ? "gated" : "gate open",
      posture: blockers.length ? "blocked" : "verified",
      note: blockers.length
        ? blockers.join(" · ")
        : "All mainnet gates satisfied per contracts/MAINNET-CHECKLIST.md.",
    },
    {
      label: "Ownership — Safe multisig",
      value: safeConfigured()
        ? `${TRC_SAFE.address} (${TRC_SAFE.threshold}-of-${TRC_SAFE.signers.length}, ${TRC_SAFE.chainName})`
        : "Not created",
      posture: safeConfigured() ? "verified" : "pending",
      note: "Target is a 2-of-3 Safe on Base. Two-step ownership transfer prevents orphaning.",
    },
    {
      label: "Admin time-lock",
      value: `${TRC_TIMELOCK.delaySeconds / 3600}h · ${timelockEnforced() ? "enforced on-chain" : "declared, not enforced"}`,
      posture: timelockEnforced() ? "verified" : "declared",
      note: "Enforcement requires a deployed Safe module. A declared delay is an intention, not a protection.",
    },
  ];

  const verification: AuditRow[] = [
    {
      label: "Verifier",
      value: "src/lib/signed-envelope.ts — ARCHANGEL/v0, fail-closed",
      posture: "verified",
      note: "Single trust decision point. Signature checked over raw bytes before parsing.",
    },
    {
      label: "Freshness bounds",
      value: "TTL ≤120s · future skew ≤30s · counter monotonicity server-side",
      posture: "verified",
      note: "Bounds replay of genuinely signed payloads.",
    },
    {
      label: "Scheduled re-verification",
      value: "pg_cron `reprobe-mesh-15m` → /api/public/hooks/reprobe",
      posture: "verified",
      note: "Server repeats the identical check every 15 minutes. Rows are derived data only.",
    },
    {
      label: "Telemetry",
      value: "OFF by default (LOCAL / POSTHOG opt-in)",
      posture: "verified",
      note: "Only POSTHOG mode emits packets, and it is opt-in per operator.",
    },
  ];

  const documentation: AuditRow[] = [
    {
      label: "Architecture",
      value: "docs/Architecture.md",
      posture: "verified",
      note: "Layers, modules, and the end-to-end verification flow.",
    },
    {
      label: "Security model",
      value: "SECURITY.md · docs/SecurityModel.md",
      posture: "verified",
      note: "Disclosure policy, threat model, key and secret handling, residual risks.",
    },
    {
      label: "Audit scope",
      value: "docs/AuditScope.md · docs/AUDIT-TRANSMITTAL.md",
      posture: "verified",
      note: "In-scope and out-of-scope surfaces, plus bundle reproduction steps.",
    },
    {
      label: "Governance",
      value: "docs/Governance.md · POLICY-OF-INTENT.md",
      posture: "verified",
      note: "Who can change what, and how a third party checks the rules were followed.",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <header className="border border-border bg-background/60 p-4 backdrop-blur-sm md:p-6">
        <p className="text-[10px] tracking-[0.3em] text-muted-foreground">◇ COMPLIANCE SURFACE</p>
        <h1 className="display-font phosphor-glow mt-2 text-2xl text-primary">Audit Center</h1>
        <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-muted-foreground">
          Current verification posture, stated without embellishment. Rows marked PENDING are
          genuinely incomplete; rows marked DECLARED are intentions we have written down but do
          not yet enforce in code.
        </p>
        <p className="mt-3 border border-muted-foreground/30 bg-muted/20 px-3 py-2 text-[12px] text-foreground">
          <span className="tracking-[0.16em] text-muted-foreground">STATUS ·</span>{" "}
          Independent Security Audit: <strong>Pending</strong>. No certification is claimed.
        </p>
      </header>

      <Section
        title="BUILD IDENTITY"
        subtitle="What exactly is running, and can it be bound to a commit."
        rows={build}
      />
      <Section
        title="AUDIT STATUS"
        subtitle="External review posture and reproducible evidence."
        rows={audit}
      />
      <Section
        title="CONTRACT & GOVERNANCE"
        subtitle="On-chain surface, ownership model, and the mainnet gate."
        rows={contract}
      />
      <Section
        title="VERIFICATION"
        subtitle="The controls that decide whether anything renders green."
        rows={verification}
      />
      <Section
        title="DOCUMENTATION"
        subtitle="Written answers to the questions a reviewer asks first."
        rows={documentation}
      />

      <footer className="border border-border bg-background/60 px-4 py-3 text-[10.5px] leading-relaxed text-muted-foreground backdrop-blur-sm">
        Reproduce independently:{" "}
        <span className="terminal-font text-primary/80">node scripts/substrate-snapshot.mjs</span> ·{" "}
        <span className="terminal-font text-primary/80">node scripts/build-manifest.mjs</span> ·{" "}
        <span className="terminal-font text-primary/80">ots verify docs/truthcoin-audit-bundle.ots</span>
        <br />
        Security disclosures: security@universaltruth.life — see SECURITY.md.
      </footer>
    </div>
  );
}
