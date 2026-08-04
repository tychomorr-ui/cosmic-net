import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

export type FederationEventRow = {
  event_id: string;
  node_id: string | null;
  event_type: string;
  emitted_at: string | null;
  received_at: string;
  state: string;
  reason: string | null;
};

export type FederationInboxData = {
  secretConfigured: boolean;
  events: FederationEventRow[];
  registry: {
    node_id: string;
    webhook_url: string;
    coupled: boolean;
    last_seen_at: string | null;
  }[];
};

/** Public, metadata-only read of the quarantined inbound federation log. */
export const federationInbox = createServerFn({ method: "GET" }).handler(
  async (): Promise<FederationInboxData> => {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const supabase = createClient(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false },
    });
    const [{ data: events }, { data: registry }] = await Promise.all([
      supabase
        .from("federation_events")
        .select("event_id, node_id, event_type, emitted_at, received_at, state, reason")
        .order("received_at", { ascending: false })
        .limit(20),
      supabase
        .from("federation_peers_registry")
        .select("node_id, webhook_url, coupled, last_seen_at")
        .order("registered_at", { ascending: false })
        .limit(20),
    ]);
    return {
      secretConfigured: Boolean(process.env["NEXINUS_WEBHOOK_SECRET"]),
      events: (events ?? []) as FederationEventRow[],
      registry: (registry ?? []) as FederationInboxData["registry"],
    };
  },
);
