
-- Append-only history of every probe result.
CREATE TABLE public.node_probes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id uuid NOT NULL,
  node_id text NOT NULL,
  node_name text NOT NULL,
  probe_kind text NOT NULL,
  target text,
  state text NOT NULL CHECK (state IN ('measured','reachable','unreachable','doctrine','broken')),
  detail text NOT NULL,
  payload_cid text,
  signed_ts bigint,
  expected_pub text,
  last_probed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX node_probes_node_time_idx ON public.node_probes (node_id, last_probed_at DESC);
CREATE INDEX node_probes_run_idx ON public.node_probes (run_id);

GRANT SELECT ON public.node_probes TO anon;
GRANT SELECT ON public.node_probes TO authenticated;
GRANT ALL ON public.node_probes TO service_role;

ALTER TABLE public.node_probes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Probes are publicly readable"
  ON public.node_probes FOR SELECT
  USING (true);
-- No INSERT/UPDATE/DELETE policies => only service_role (via bypass) can write.

-- One row per node, holding the latest observed state.
CREATE TABLE public.node_probes_latest (
  node_id text NOT NULL PRIMARY KEY,
  node_name text NOT NULL,
  probe_kind text NOT NULL,
  target text,
  state text NOT NULL CHECK (state IN ('measured','reachable','unreachable','doctrine','broken')),
  detail text NOT NULL,
  payload_cid text,
  signed_ts bigint,
  expected_pub text,
  run_id uuid NOT NULL,
  last_probed_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.node_probes_latest TO anon;
GRANT SELECT ON public.node_probes_latest TO authenticated;
GRANT ALL ON public.node_probes_latest TO service_role;

ALTER TABLE public.node_probes_latest ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Latest probe state is publicly readable"
  ON public.node_probes_latest FOR SELECT
  USING (true);

-- pg_cron + pg_net for the 15-minute honest re-probe.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
