// Pass 2 — Honest centralization inventory.
//
// Enumerates every non-sovereign dependency the running browser app actually
// has. The point is NOT to hide these; the point is to make them visible so
// no UI string can quietly imply we've already removed them.
//
// "sovereignty_path" describes the concrete migration step — not a promise.

export type Centralized = {
  id: string;
  host: string;
  purpose: string;
  category: "analytics" | "fonts" | "host" | "probe" | "registry";
  removable: "yes" | "opt-in" | "operator-choice" | "no";
  sovereignty_path: string;
};

export const CENTRALIZATION_INVENTORY: Centralized[] = [
  {
    id: "posthog",
    host: "us.i.posthog.com",
    purpose: "Page-view + session-replay analytics.",
    category: "analytics",
    removable: "yes",
    sovereignty_path:
      "Pass 4: replace with IndexedDB-backed local event log, default OFF, no network egress.",
  },
  {
    id: "google-fonts",
    host: "fonts.googleapis.com / fonts.gstatic.com",
    purpose: "Web fonts (VT323, Major Mono Display, JetBrains Mono).",
    category: "fonts",
    removable: "yes",
    sovereignty_path:
      "Pass 3: self-host woff2 under /fonts; remove CDN preconnect from __root.tsx.",
  },
  {
    id: "cloudflare-worker",
    host: "*.lovable.app (Cloudflare Worker)",
    purpose: "Serves the SSR shell and static assets today.",
    category: "host",
    removable: "operator-choice",
    sovereignty_path:
      "Pass 3: emit a `dist-static/` SPA build with relative base; pin CID via IPFS; map IPNS/ENS.",
  },
  {
    id: "monarch",
    host: "monarch.xinus.one",
    purpose: "Operator-run signed /health probe target.",
    category: "probe",
    removable: "operator-choice",
    sovereignty_path:
      "Already sovereign per operator. Browser verifies signature locally; no managed service in the path.",
  },
  {
    id: "valkyrie",
    host: "valkyrie.nexinus.net",
    purpose: "Operator-run gateway probe target.",
    category: "probe",
    removable: "operator-choice",
    sovereignty_path:
      "Operator infra. Probe currently failing — UI must surface UNREACHABLE honestly.",
  },
  {
    id: "resonate-earth",
    host: "resonate-earth.live",
    purpose: "Sovereign node opaque HEAD reach.",
    category: "probe",
    removable: "operator-choice",
    sovereignty_path:
      "Reach only, no body. Promote to 'provable' once node exposes CORS-readable signed /status.",
  },
  {
    id: "posthog-ingest",
    host: "us.i.posthog.com (session recording)",
    purpose: "Session replay ingest.",
    category: "analytics",
    removable: "yes",
    sovereignty_path:
      "Pass 4: disabled when local-only telemetry toggle is off (default).",
  },
];

export function inventoryTally() {
  const t = { yes: 0, "opt-in": 0, "operator-choice": 0, no: 0 } as Record<
    Centralized["removable"],
    number
  >;
  for (const r of CENTRALIZATION_INVENTORY) t[r.removable]++;
  return t;
}
