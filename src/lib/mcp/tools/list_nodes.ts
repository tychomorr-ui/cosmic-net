import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { NODES } from "@/data/nodes";

export default defineTool({
  name: "list_nodes",
  title: "List sovereign nodes",
  description:
    "List all declared sovereign mesh nodes in the cMAP fleet with their region, role, tier, declared purpose, and public probe endpoint. Public, read-only.",
  inputSchema: {
    tier: z
      .enum(["measured", "attested", "doctrine"])
      .optional()
      .describe("Optional filter by declared tier."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ tier }) => {
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
