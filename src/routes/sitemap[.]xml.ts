import { createFileRoute } from "@tanstack/react-router";
import { renderSitemapIndex, xmlResponse } from "@/lib/sitemap-routes";

// Sitemap index: points at per-section child sitemaps so the site can grow
// without hitting per-file limits. Sections live in src/lib/sitemap-routes.ts.
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () => xmlResponse(renderSitemapIndex()),
    },
  },
});
