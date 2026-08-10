// Public status surface for the NEXINUS link.
//
//   GET /api/public/hooks/nexinus/status
//
// Metadata only — never the event payloads.

import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function hostOnly(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "invalid-url";
  }
}

export const Route = createFileRoute("/api/public/hooks/nexinus/status")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      GET: async () => {
        // The federation tables are closed to anon/authenticated roles. This
        // handler is the only public surface and emits sanitized metadata:
        // no Ed25519 keys, no peer claims, no event payloads, host-only URLs.
        const { supabaseAdmin: supabase } = await import(
          "@/integrations/supabase/client.server"
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

        const registry = (peers ?? []).map((p) => ({
          node_id: p.node_id,
          webhook_host: hostOnly(p.webhook_url),
          coupled: p.coupled,
          last_seen_at: p.last_seen_at,
          registered_at: p.registered_at,
        }));

        return new Response(
          JSON.stringify({
            secret_configured: Boolean(process.env["NEXINUS_WEBHOOK_SECRET"]),
            inbound_endpoint: "/api/public/hooks/nexinus",
            registry,
            coupled_peers: registry.filter((p) => p.coupled).length,
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
