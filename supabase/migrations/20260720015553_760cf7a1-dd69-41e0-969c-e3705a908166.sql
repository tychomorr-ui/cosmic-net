
-- Provenance webhook endpoints (Pro tier)
CREATE TABLE public.provenance_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url text NOT NULL,
  secret text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  last_delivery_at timestamptz,
  last_status integer,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.provenance_webhooks TO authenticated;
GRANT ALL ON public.provenance_webhooks TO service_role;

ALTER TABLE public.provenance_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own webhooks"
  ON public.provenance_webhooks
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_provenance_webhooks_user ON public.provenance_webhooks(user_id) WHERE active;

CREATE TRIGGER trg_provenance_webhooks_updated_at
  BEFORE UPDATE ON public.provenance_webhooks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Count stamps for the current calendar month for a user
CREATE OR REPLACE FUNCTION public.get_stamp_count_this_month(user_uuid uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.stamps
  WHERE user_id = user_uuid
    AND created_at >= date_trunc('month', now());
$$;

-- Resolve a user's tier from their active subscription's price_id
CREATE OR REPLACE FUNCTION public.get_subscription_tier(user_uuid uuid, check_env text DEFAULT 'live')
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN NOT public.has_active_subscription(user_uuid, check_env) THEN 'none'
    WHEN EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = user_uuid
        AND s.environment = check_env
        AND s.price_id IN ('cmap_pro_monthly', 'cmap_pro_yearly')
        AND (
          (s.status IN ('active','trialing') AND (s.current_period_end IS NULL OR s.current_period_end > now()))
          OR (s.status = 'canceled' AND s.current_period_end > now())
        )
    ) THEN 'pro'
    ELSE 'starter'
  END;
$$;
