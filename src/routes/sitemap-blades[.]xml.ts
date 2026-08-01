import { createFileRoute } from "@tanstack/react-router";
import { renderUrlSet, sectionPaths, xmlResponse } from "@/lib/sitemap-routes";

export const Route = createFileRoute("/sitemap-blades.xml")({
  server: {
    handlers: {
      GET: () => xmlResponse(renderUrlSet(sectionPaths("blades"), "weekly")),
    },
  },
});
