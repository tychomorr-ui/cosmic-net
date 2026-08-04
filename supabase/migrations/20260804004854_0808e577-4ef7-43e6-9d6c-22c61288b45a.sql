CREATE TABLE public.federation_peers_registry (
  node_id TEXT PRIMARY KEY,
  webhook_url TEXT NOT NULL,
  ed25519_pub TEXT,
  claims JSONB NOT NULL DEFAULT '{}'::jsonb,
  coupled BOOLEAN NOT NULL DEFAULT false,
  last_seen_at TIMESTAMPTZ,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.federation_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  node_id TEXT,
  event_type TEXT NOT NULL,
  emitted_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  state TEXT NOT NULL DEFAULT 'QUARANTINED',
  reason TEXT,
  payload JSONB NOT NULL
);

CREATE INDEX federation_events_received_idx ON public.federation_events (received_at DESC);

GRANT ALL ON public.federation_peers_registry TO service_role;
GRANT ALL ON public.federation_events TO service_role;
GRANT SELECT (node_id, webhook_url, coupled, last_seen_at, registered_at) ON public.federation_peers_registry TO anon, authenticated;
GRANT SELECT (id, event_id, node_id, event_type, emitted_at, received_at, state, reason) ON public.federation_events TO anon, authenticated;

ALTER TABLE public.federation_peers_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.federation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "registry is publicly readable" ON public.federation_peers_registry FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "event metadata is publicly readable" ON public.federation_events FOR SELECT TO anon, authenticated USING (true);