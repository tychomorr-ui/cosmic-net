DROP POLICY IF EXISTS "Probes are publicly readable" ON public.node_probes;
DROP POLICY IF EXISTS "Latest probe state is publicly readable" ON public.node_probes_latest;
DROP POLICY IF EXISTS "registry is publicly readable" ON public.federation_peers_registry;
DROP POLICY IF EXISTS "event metadata is publicly readable" ON public.federation_events;

REVOKE ALL ON public.node_probes FROM anon, authenticated;
REVOKE ALL ON public.node_probes_latest FROM anon, authenticated;
REVOKE ALL ON public.federation_peers_registry FROM anon, authenticated;
REVOKE ALL ON public.federation_events FROM anon, authenticated;

GRANT ALL ON public.node_probes TO service_role;
GRANT ALL ON public.node_probes_latest TO service_role;
GRANT ALL ON public.federation_peers_registry TO service_role;
GRANT ALL ON public.federation_events TO service_role;

ALTER TABLE public.node_probes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.node_probes_latest ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.federation_peers_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.federation_events ENABLE ROW LEVEL SECURITY;