-- Harden provenance_webhooks: the `secret` column is a signing credential.
-- The owner needs it exactly once, at creation time (returned by the server
-- function). After that, only the service role needs to read it in order to
-- compute HMAC signatures. Column-level privileges make read-back impossible
-- via the Data API even for the row owner, so a compromised session token
-- cannot exfiltrate signing secrets.

REVOKE SELECT, UPDATE ON public.provenance_webhooks FROM authenticated;

GRANT SELECT (
  id, user_id, url, active, last_delivery_at, last_status, last_error,
  created_at, updated_at
) ON public.provenance_webhooks TO authenticated;

GRANT UPDATE (url, active, updated_at) ON public.provenance_webhooks TO authenticated;

-- INSERT stays table-wide so createWebhook can write the generated secret.
GRANT INSERT ON public.provenance_webhooks TO authenticated;
GRANT DELETE ON public.provenance_webhooks TO authenticated;

-- The delivery worker runs as service_role and keeps full access.
GRANT ALL ON public.provenance_webhooks TO service_role;