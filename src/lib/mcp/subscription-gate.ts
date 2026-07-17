// Subscription gate for MCP tool handlers.
// Every gated tool calls requireActiveSubscription(ctx) at the top of its
// handler. If the caller has no active paid subscription, the tool returns
// an MCP error result pointing the caller at /pricing on the app.

import type { ToolContext } from "@lovable.dev/mcp-js";
import { createClient } from "@supabase/supabase-js";

type McpErrorResult = {
  content: { type: "text"; text: string }[];
  isError: true;
};

function siteOrigin(): string {
  return process.env.PUBLIC_SITE_URL || "https://cosmictruth.lovable.app";
}

function environment(): "sandbox" | "live" {
  // Prefer explicit env, otherwise default to live in production, sandbox otherwise.
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
  | { ok: true; userId: string }
  | { ok: false; response: McpErrorResult };

export async function requireActiveSubscription(
  ctx: ToolContext,
): Promise<GateResult> {
  if (!ctx.isAuthenticated || !ctx.isAuthenticated()) {
    return {
      ok: false,
      response: {
        content: [
          {
            type: "text",
            text: `Sign in required. Visit ${siteOrigin()}/auth to sign in, then connect this MCP server again.`,
          },
        ],
        isError: true,
      },
    };
  }
  const userId = ctx.getUserId();
  if (!userId) {
    return {
      ok: false,
      response: {
        content: [{ type: "text", text: "Missing user identity in token." }],
        isError: true,
      },
    };
  }

  const env = environment();
  const { data, error } = await admin().rpc("has_active_subscription", {
    user_uuid: userId,
    check_env: env,
  });
  if (error) {
    return {
      ok: false,
      response: {
        content: [{ type: "text", text: `Subscription check failed: ${error.message}` }],
        isError: true,
      },
    };
  }
  if (!data) {
    return {
      ok: false,
      response: {
        content: [
          {
            type: "text",
            text:
              `Active subscription required. Subscribe at ${siteOrigin()}/pricing ` +
              `to unlock the cMAP MCP server ($19/month). This tool is read-only; ` +
              `once subscribed, reconnect the MCP server in your AI client.`,
          },
        ],
        isError: true,
      },
    };
  }
  return { ok: true, userId };
}
