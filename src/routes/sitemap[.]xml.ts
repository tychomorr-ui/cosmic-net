import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://universaltruth.life";

// Mirrors src/routes/*.tsx exactly (post-purge: no /forge, /payment-nexus,
// /investigation). /ops and /verify are operator surfaces and are excluded
// here to match the Disallow rules in public/robots.txt.
// Added 2026-07-31: /audit, /docs, /ledger, /mesh, /pricing.
const PATHS = [
  "/",
  "/digital-ore",
  "/fleet",
  "/gateway",
  "/nebula",
  "/pam",
  "/proof-fulcrum",
  "/quantotalus",
  "/reclaim",
  "/reflective-intel",
  "/sam-command",
  "/seventh-dimension",
  "/status",
  "/sudo-coin",
  "/truth-coin",
  "/truth-point",
  "/audit",
  "/docs",
  "/ledger",
  "/mesh",
  "/pricing",
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
