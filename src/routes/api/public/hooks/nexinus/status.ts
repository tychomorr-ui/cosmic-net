// Public status surface for the NEXINUS link.
//
//   GET /api/public/hooks/nexinus/status
//
// Metadata only — never the event payloads.

import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const Route = createFileRoute("/api/public/hooks/nexinus/status")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      GET: async () => {
        const supabase = createClient(
          process.env["SUPABASE_URL"]!,
          process.env["SUPABASE_PUBLISHABLE_KEY"]!,
          { auth: { persistSession: false } },
        );
        const [{ data: peers }, { data: events }] = await Promise.all([
          supabase
            .from("federation_peers_registry")
            .select("node_id, webhook_url, coupled, last_seen_at, registered_at"),
          supabase
            .from("federation_events")
            .select("event_type, state, received_at")
            .order("received_at", { ascending: false })
            .limit(200),
        ]);

        const byType: Record<string, number> = {};
        for (const e of events ?? []) {
          byType[e.event_type] = (byType[e.event_type] ?? 0) + 1;
        }

        return new Response(
          JSON.stringify({
            secret_configured: Boolean(process.env["NEXINUS_WEBHOOK_SECRET"]),
            inbound_endpoint: "/api/public/hooks/nexinus",
            registry: peers ?? [],
            coupled_peers: (peers ?? []).filter((p) => p.coupled).length,
            events_recent: events?.length ?? 0,
            events_by_type: byType,
            all_events_quarantined: (events ?? []).every(
              (e) => e.state === "QUARANTINED",
            ),
            note: "Shared-secret authentication only. No inbound event is admitted to the ledger.",
            timestamp: new Date().toISOString(),
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...CORS } },
        );
      },
    },
  },
});
