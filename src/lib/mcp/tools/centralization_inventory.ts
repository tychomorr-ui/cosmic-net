import { defineTool } from "@lovable.dev/mcp-js";
import { CENTRALIZATION_INVENTORY, inventoryTally } from "@/lib/centralization-inventory";

export default defineTool({
  name: "centralization_inventory",
  title: "Centralization inventory",
  description:
    "Return the honest inventory of every non-sovereign dependency the cMAP browser app has (analytics, fonts, host, probes), the removable status of each, and the migration path to sovereignty. Public, read-only.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const tally = inventoryTally();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { tally, entries: CENTRALIZATION_INVENTORY },
            null,
            2,
          ),
        },
      ],
      structuredContent: { tally, entries: CENTRALIZATION_INVENTORY },
    };
  },
});
