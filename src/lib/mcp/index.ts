import { defineMcp } from "@lovable.dev/mcp-js";
import listNodes from "./tools/list_nodes";
import listBlades from "./tools/list_blades";
import centralizationInventory from "./tools/centralization_inventory";

export default defineMcp({
  name: "cmap-mcp",
  title: "cMAP — Cosmic Mesh Alignment Protocol",
  version: "0.1.0",
  instructions:
    "Read-only tools that expose the public cMAP sovereign mesh: the OMNI-SAM AXIS blade registry, the declared sovereign node fleet, and the honest centralization inventory. All data is intentionally public. Use list_nodes to enumerate the fleet, list_blades for the 13-blade axis, and centralization_inventory to see which non-sovereign dependencies remain and their migration paths.",
  tools: [listNodes, listBlades, centralizationInventory],
});
