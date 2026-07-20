import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const URL_RE = /^https:\/\/[^\s]+$/i;

export const listWebhooks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("provenance_webhooks")
      .select("id, url, active, last_status, last_error, last_delivery_at, created_at")
      .order("created_at", { ascending: false });
    if (error) return { error: error.message };
    return { webhooks: data ?? [] };
  });

export const createWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { url: string }) => {
    const parsed = z
      .object({
        url: z.string().regex(URL_RE, "Must be an https:// URL").max(2048),
      })
      .parse(data);
    return parsed;
  })
  .handler(async ({ data, context }) => {
    // Generate a per-endpoint HMAC secret.
    const secretBytes = new Uint8Array(32);
    crypto.getRandomValues(secretBytes);
    const secret =
      "whsec_" +
      Array.from(secretBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    const { data: row, error } = await context.supabase
      .from("provenance_webhooks")
      .insert({
        user_id: context.userId,
        url: data.url,
        secret,
        active: true,
      })
      .select("id, url, active, created_at")
      .single();
    if (error) return { error: error.message };
    // Return secret ONCE so the user can copy it into their receiving service.
    return { webhook: row, secret };
  });

export const deleteWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("provenance_webhooks")
      .delete()
      .eq("id", data.id);
    if (error) return { error: error.message };
    return { ok: true };
  });
