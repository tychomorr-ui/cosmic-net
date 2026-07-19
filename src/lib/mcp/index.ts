import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listNodes from "./tools/list_nodes";
import listBlades from "./tools/list_blades";
import centralizationInventory from "./tools/centralization_inventory";
import provenanceRecord from "./tools/provenance_record";
import provenanceOtsStamp from "./tools/provenance_ots_stamp";

// The OAuth issuer MUST be the direct Supabase host, never the .lovable.cloud
// proxy — mcp-js rejects any token whose configured issuer doesn't match the
// discovery document's issuer (RFC 8414 §3.3).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "cmap-mcp",
  title: "cMAP — Cosmic Mesh Alignment Protocol",
  version: "0.2.0",
  instructions:
    "Subscription-gated MCP server for cMAP (Cosmic Mesh Alignment Protocol). " +
    "Read-only tools that expose the OMNI-SAM AXIS blade registry, the sovereign node fleet, " +
    "and the honest centralization inventory, plus paid Provenance stamping (record + OTS " +
    "anchor to Bitcoin via OpenTimestamps). Requires an active subscription: sign in and " +
    "subscribe at https://cosmictruth.lovable.app/pricing to unlock. Tools: list_nodes, " +
    "list_blades, centralization_inventory, provenance_record, provenance_ots_stamp.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listNodes,
    listBlades,
    centralizationInventory,
    provenanceRecord,
    provenanceOtsStamp,
  ],
});
