import { createFileRoute } from "@tanstack/react-router";
import { BLADES } from "@/data/blades";
import { BladeStandby } from "@/components/blades/BladeStandby";
import { QuantotalusTriad } from "@/components/blades/QuantotalusTriad";

const BLADE = BLADES.find((b) => b.n === "12");
if (!BLADE) throw new Error("QUANTOTALUS blade is not registered");

export const Route = createFileRoute("/quantotalus")({
  head: () => ({ meta: [
      { property: "og:title", content: `${BLADE.name} · Blade ${BLADE.n}` },
      { property: "og:description", content: BLADE.tagline },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },{ title: `${BLADE.name} · Blade ${BLADE.n}` }, { name: "description", content: BLADE.tagline }] }),
  component: () => <BladeStandby blade={BLADE}><QuantotalusTriad /></BladeStandby>,
});
