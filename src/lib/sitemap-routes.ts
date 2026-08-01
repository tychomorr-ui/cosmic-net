/**
 * Single source of truth for public, crawlable routes.
 *
 * Mirrors src/routes/*.tsx. Operator surfaces (/ops, /verify) and
 * auth/session routes are intentionally excluded to match public/robots.txt.
 *
 * Sitemaps are served as an index (/sitemap.xml) pointing at per-section
 * child sitemaps, so new sections can be added without touching Google's
 * per-file limits (50,000 URLs / 50 MB uncompressed).
 */

export const BASE_URL = "https://universaltruth.life";

/** Hard cap per child sitemap file (Google's limit is 50,000). */
export const MAX_URLS_PER_SITEMAP = 5000;

export type ChangeFreq = "daily" | "weekly" | "monthly";

export type SitemapSection = {
  /** Slug used in the child sitemap filename: /sitemap-{id}.xml */
  id: string;
  changefreq: ChangeFreq;
  paths: string[];
};

export const SITEMAP_SECTIONS: SitemapSection[] = [
  {
    id: "core",
    changefreq: "daily",
    paths: ["/", "/status", "/mesh", "/ledger", "/pricing"],
  },
  {
    id: "docs",
    changefreq: "weekly",
    paths: ["/docs", "/audit", "/proof-fulcrum"],
  },
  {
    id: "blades",
    changefreq: "weekly",
    paths: [
      "/digital-ore",
      "/fleet",
      "/gateway",
      "/nebula",
      "/pam",
      "/quantotalus",
      "/reclaim",
      "/reflective-intel",
      "/sam-command",
      "/seventh-dimension",
      "/sudo-coin",
      "/truth-coin",
      "/truth-point",
    ],
  },
];

/** Child sitemap file names, expanded when a section exceeds the cap. */
export function sitemapFiles(): string[] {
  return SITEMAP_SECTIONS.flatMap((section) => {
    const parts = Math.max(
      1,
      Math.ceil(section.paths.length / MAX_URLS_PER_SITEMAP),
    );
    return parts === 1
      ? [`sitemap-${section.id}.xml`]
      : Array.from(
          { length: parts },
          (_, i) => `sitemap-${section.id}-${i + 1}.xml`,
        );
  });
}

/** Paths belonging to one child sitemap file (1-indexed part). */
export function sectionPaths(id: string, part = 1): string[] {
  const section = SITEMAP_SECTIONS.find((s) => s.id === id);
  if (!section) return [];
  const start = (part - 1) * MAX_URLS_PER_SITEMAP;
  return section.paths.slice(start, start + MAX_URLS_PER_SITEMAP);
}

export function xmlResponse(xml: string): Response {
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export function renderUrlSet(paths: string[], changefreq: ChangeFreq): string {
  const urls = paths
    .map(
      (p) =>
        `  <url><loc>${BASE_URL}${p}</loc><changefreq>${changefreq}</changefreq></url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

export function renderSitemapIndex(): string {
  const entries = sitemapFiles()
    .map((file) => `  <sitemap><loc>${BASE_URL}/${file}</loc></sitemap>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>`;
}
