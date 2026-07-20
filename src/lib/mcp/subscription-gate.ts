// Subscription + quota gate for MCP tool handlers.
//
// Tiers:
//   - starter: 1,000 stamps / calendar month, no webhooks
//   - pro:     unlimited stamps + per-stamp signed webhooks
//   - none:    blocked, sent to /pricing

import type { ToolContext } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";

type McpErrorResult = {
  content: { type: "text"; text: string }[];
  isError: true;
};

export type Tier = "none" | "starter" | "pro";

export const STARTER_MONTHLY_LIMIT = 1000;

function siteOrigin(): string {
  return process.env.PUBLIC_SITE_URL || "https://cosmictruth.lovable.app";
}

function environment(): "sandbox" | "live" {
  const explicit = process.env.PAYMENTS_ENVIRONMENT;
  if (explicit === "sandbox" || explicit === "live") return explicit;
  return process.env.NODE_ENV === "production" ? "live" : "sandbox";
}

let _admin: any = null;
function admin(): any {
  if (!_admin) {
    _admin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _admin;
}

export type GateResult =
  | { ok: true; userId: string; tier: Exclude<Tier, "none">; remaining: number | null }
  | { ok: false; response: McpErrorResult };

function errText(text: string): McpErrorResult {
  return { content: [{ type: "text", text }], isError: true };
}

export async function requireActiveSubscription(
  ctx: ToolContext,
): Promise<GateResult> {
  if (!ctx.isAuthenticated || !ctx.isAuthenticated()) {
    return {
      ok: false,
      response: errText(
        `Sign in required. Visit ${siteOrigin()}/auth to sign in, then reconnect this MCP server.`,
      ),
    };
  }
  const userId = ctx.getUserId();
  if (!userId) return { ok: false, response: errText("Missing user identity in token.") };

  const env = environment();
  const { data: tierData, error: tierErr } = await admin().rpc("get_subscription_tier", {
    user_uuid: userId,
    check_env: env,
  });
  if (tierErr) return { ok: false, response: errText(`Subscription check failed: ${tierErr.message}`) };

  const tier = (tierData ?? "none") as Tier;
  if (tier === "none") {
    return {
      ok: false,
      response: errText(
        `Active subscription required. Subscribe at ${siteOrigin()}/pricing — ` +
          `Starter ($19/mo, 1,000 stamps) or Pro ($99/mo, unlimited + webhook delivery). ` +
          `Once subscribed, reconnect the MCP server in your AI client.`,
      ),
    };
  }

  // Enforce Starter monthly cap.
  if (tier === "starter") {
    const { data: countData, error: countErr } = await admin().rpc(
      "get_stamp_count_this_month",
      { user_uuid: userId },
    );
    if (countErr) return { ok: false, response: errText(`Quota check failed: ${countErr.message}`) };
    const used = Number(countData ?? 0);
    const remaining = STARTER_MONTHLY_LIMIT - used;
    if (remaining <= 0) {
      // Hard cap: HTTP 402-flavored error text with upgrade link.
      return {
        ok: false,
        response: errText(
          `402 Payment Required — Starter tier limit reached (${used}/${STARTER_MONTHLY_LIMIT} stamps this month). ` +
            `Upgrade to Pro at ${siteOrigin()}/pricing for unlimited stamps and webhook delivery. ` +
            `Quota resets on the 1st of next month.`,
        ),
      };
    }
    return { ok: true, userId, tier: "starter", remaining };
  }

  return { ok: true, userId, tier: "pro", remaining: null };
}
