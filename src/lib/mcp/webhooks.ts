// Per-stamp webhook delivery for Pro-tier subscribers.
//
// After a stamp is recorded, we look up the caller's active webhook endpoints
// and POST an HMAC-SHA256-signed JSON receipt to each. Delivery is best-effort
// and time-bounded so the tool call still returns fast; results are written
// back to the row so the customer can see what happened in their account.

import { createClient } from "@supabase/supabase-js";
import { createHmac } from "crypto";

const DELIVERY_TIMEOUT_MS = 4000;

let _admin: any = null;
function admin(): any {
  if (!_admin) {
    _admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  }
  return _admin;
}

export type StampReceipt = {
  id: string;
  sha256: string;
  label: string | null;
  kind: string;
  status: string;
  created_at: string;
  calendars?: unknown;
};

export type WebhookDelivery = {
  webhook_id: string;
  url: string;
  ok: boolean;
  status?: number;
  error?: string;
};

async function deliverOne(
  endpoint: { id: string; url: string; secret: string },
  payload: string,
): Promise<WebhookDelivery> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);
  const signature = createHmac("sha256", endpoint.secret).update(payload).digest("hex");
  const ts = Math.floor(Date.now() / 1000).toString();
  const tsSig = createHmac("sha256", endpoint.secret).update(`${ts}.${payload}`).digest("hex");
  try {
    const res = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "cMAP-Provenance-Webhook/1.0",
        "X-CMAP-Signature": signature,
        "X-CMAP-Timestamp": ts,
        "X-CMAP-Signature-V1": `t=${ts},v1=${tsSig}`,
        "X-CMAP-Event": "stamp.recorded",
      },
      body: payload,
      signal: controller.signal,
    });
    return { webhook_id: endpoint.id, url: endpoint.url, ok: res.ok, status: res.status };
  } catch (e: any) {
    return {
      webhook_id: endpoint.id,
      url: endpoint.url,
      ok: false,
      error: e?.message ?? String(e),
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function deliverStampWebhooks(
  userId: string,
  stamp: StampReceipt,
): Promise<WebhookDelivery[]> {
  const { data: hooks, error } = await admin()
    .from("provenance_webhooks")
    .select("id, url, secret")
    .eq("user_id", userId)
    .eq("active", true);
  if (error || !hooks || hooks.length === 0) return [];

  const payload = JSON.stringify({
    event: "stamp.recorded",
    delivered_at: new Date().toISOString(),
    stamp,
  });

  const deliveries = await Promise.all(
    hooks.map((h: any) => deliverOne(h, payload)),
  );

  // Fire-and-forget: update endpoint status. We do await to keep behavior
  // predictable inside a Worker's isolate, but errors are swallowed.
  await Promise.all(
    deliveries.map((d) =>
      admin()
        .from("provenance_webhooks")
        .update({
          last_delivery_at: new Date().toISOString(),
          last_status: d.status ?? null,
          last_error: d.ok ? null : (d.error ?? `HTTP ${d.status ?? "?"}`),
        })
        .eq("id", d.webhook_id)
        .then(() => undefined, () => undefined),
    ),
  );

  return deliveries;
}
