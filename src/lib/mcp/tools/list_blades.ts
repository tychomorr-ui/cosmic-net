import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { BLADES } from "@/data/blades";
import { requireActiveSubscription } from "../subscription-gate";

export default defineTool({
  name: "list_blades",
  title: "List OMNI-SAM AXIS blades",
  description:
    "List the registered OMNI-SAM AXIS blades of cMAP with status (LIVE, STANDBY), sovereign route, and tagline. Purged blades are not registered. Requires an active cMAP MCP subscription.",
  inputSchema: {
    status: z
      .enum(["LIVE", "STANDBY"])
      .optional()
      .describe("Optional filter by blade status."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status }, ctx) => {
    const gate = await requireActiveSubscription(ctx);
    if (!gate.ok) return gate.response;

    const blades = status ? BLADES.filter((b) => b.status === status) : BLADES;
    return {
      content: [{ type: "text", text: JSON.stringify(blades, null, 2) }],
      structuredContent: { blades, count: blades.length },
    };
  },
});
