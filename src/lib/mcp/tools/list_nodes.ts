import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { NODES } from "@/data/nodes";
import { requireActiveSubscription } from "../subscription-gate";

export default defineTool({
  name: "list_nodes",
  title: "List sovereign nodes",
  description:
    "List all declared sovereign mesh nodes in the cMAP fleet with region, role, tier, declared purpose, and public probe endpoint. Requires an active cMAP MCP subscription.",
  inputSchema: {
    tier: z
      .enum(["measured", "attested", "doctrine"])
      .optional()
      .describe("Optional filter by declared tier."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ tier }, ctx) => {
    const gate = await requireActiveSubscription(ctx);
    if (!gate.ok) return gate.response;

    const nodes = tier ? NODES.filter((n) => n.tier === tier) : NODES;
    const rows = nodes.map((n) => ({
      id: n.id,
      name: n.name,
      provider: n.provider,
      region: n.region,
      role: n.role,
      tier: n.tier,
      declared: n.declared,
      truth: n.truth,
      probe: n.probe ?? null,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { nodes: rows, count: rows.length },
    };
  },
});
