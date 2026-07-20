import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireActiveSubscription, STARTER_MONTHLY_LIMIT } from "../subscription-gate";
import { deliverStampWebhooks } from "../webhooks";

const SHA256_RE = /^[0-9a-f]{64}$/i;

export default defineTool({
  name: "provenance_record",
  title: "Record provenance stamp",
  description:
    "Record a SHA-256 hash as a provenance stamp attributed to the calling user. " +
    "Fast, no external calls. Starter tier: 1,000 stamps/month. Pro tier: unlimited + " +
    "per-stamp HMAC-signed webhook delivery to configured endpoints. Requires an active subscription.",
  inputSchema: {
    sha256: z
      .string()
      .regex(SHA256_RE, "Must be a 64-char hex SHA-256 digest.")
      .describe("Lowercase hex SHA-256 digest of the artifact to stamp."),
    label: z
      .string()
      .max(200)
      .optional()
      .describe("Optional human-readable label for the artifact."),
  },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ sha256, label }, ctx) => {
    const gate = await requireActiveSubscription(ctx);
    if (!gate.ok) return gate.response;

    const admin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data, error } = await admin
      .from("stamps")
      .insert({
        user_id: gate.userId,
        sha256: sha256.toLowerCase(),
        label: label ?? null,
        kind: "record",
        status: "recorded",
        client_id: ctx.getClientId?.() ?? null,
      })
      .select("id, sha256, label, kind, status, created_at")
      .single();

    if (error) {
      return {
        content: [{ type: "text", text: `Failed to record stamp: ${error.message}` }],
        isError: true,
      };
    }

    const deliveries =
      gate.tier === "pro" ? await deliverStampWebhooks(gate.userId, data as any) : [];

    const payload = {
      stamp: data,
      tier: gate.tier,
      quota:
        gate.tier === "starter"
          ? {
              limit: STARTER_MONTHLY_LIMIT,
              remaining_this_month: Math.max(0, (gate.remaining ?? 1) - 1),
            }
          : { limit: null, remaining_this_month: null },
      webhooks: deliveries,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
