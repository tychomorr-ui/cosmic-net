import { createFileRoute } from "@tanstack/react-router";
import { BLADES } from "@/data/blades";
import { BladeStandby } from "@/components/blades/BladeStandby";

const BLADE = BLADES.find((b) => b.n === "12")!;

export const Route = createFileRoute("/quantotalus")({
  head: () => ({ meta: [
      { property: "og:title", content: `${BLADE.name} · Blade ${BLADE.n}` },
      { property: "og:description", content: BLADE.tagline },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },{ title: `${BLADE.name} · Blade ${BLADE.n}` }, { name: "description", content: BLADE.tagline }] }),
  component: () => <BladeStandby blade={BLADE} />,
});
