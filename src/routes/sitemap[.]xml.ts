import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://cosmic-mesh-net.lovable.app";

const PATHS = [
  "/", "/ops", "/verify", "/digital-ore", "/truth-coin", "/truth-point",
  "/sudo-coin", "/fleet", "/forge", "/gateway", "/nebula", "/pam",
  "/sam-command", "/seventh-dimension", "/reclaim", "/reflective-intel",
  "/investigation", "/quantotalus", "/proof-fulcrum", "/payment-nexus",
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () => {
        const urls = PATHS.map(
          (p) =>
            `  <url><loc>${BASE_URL}${p}</loc><changefreq>weekly</changefreq></url>`,
        ).join("\n");
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
