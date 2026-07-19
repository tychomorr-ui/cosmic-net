import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireActiveSubscription } from "../subscription-gate";

const SHA256_RE = /^[0-9a-f]{64}$/i;

export default defineTool({
  name: "provenance_record",
  title: "Record provenance stamp",
  description:
    "Record a SHA-256 hash as a provenance stamp attributed to the calling user. " +
    "Fast, no external calls. Returns a receipt with the stored stamp id and timestamp. " +
    "Requires an active cMAP MCP subscription.",
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
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { stamp: data },
    };
  },
});
