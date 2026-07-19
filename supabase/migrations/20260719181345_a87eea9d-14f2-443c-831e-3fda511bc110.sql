CREATE TABLE public.stamps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sha256 TEXT NOT NULL,
  label TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('record', 'ots')),
  status TEXT NOT NULL DEFAULT 'recorded' CHECK (status IN ('recorded', 'submitted', 'failed')),
  calendars JSONB NOT NULL DEFAULT '[]'::jsonb,
  client_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stamps_user_id ON public.stamps(user_id);
CREATE INDEX idx_stamps_sha256 ON public.stamps(sha256);

GRANT SELECT, INSERT ON public.stamps TO authenticated;
GRANT ALL ON public.stamps TO service_role;

ALTER TABLE public.stamps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own stamps"
  ON public.stamps FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own stamps"
  ON public.stamps FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);