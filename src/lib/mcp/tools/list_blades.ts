import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { BLADES } from "@/data/blades";

export default defineTool({
  name: "list_blades",
  title: "List OMNI-SAM AXIS blades",
  description:
    "List the 13 canonical OMNI-SAM AXIS blades of cMAP with their status (LIVE, STANDBY, AWAITING), sovereign route, and tagline. Public, read-only.",
  inputSchema: {
    status: z
      .enum(["LIVE", "STANDBY", "AWAITING"])
      .optional()
      .describe("Optional filter by blade status."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ status }) => {
    const blades = status ? BLADES.filter((b) => b.status === status) : BLADES;
    return {
      content: [{ type: "text", text: JSON.stringify(blades, null, 2) }],
      structuredContent: { blades, count: blades.length },
    };
  },
});
