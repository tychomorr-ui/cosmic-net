
REVOKE EXECUTE ON FUNCTION public.get_stamp_count_this_month(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_subscription_tier(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_stamp_count_this_month(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_subscription_tier(uuid, text) TO service_role;
