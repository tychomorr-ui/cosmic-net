import { createFileRoute } from "@tanstack/react-router";
import { BLADES } from "@/data/blades";
import { BladeStandby } from "@/components/blades/BladeStandby";

const BLADE = BLADES.find((b) => b.n === "03")!;

export const Route = createFileRoute("/reflective-intel")({
  head: () => ({ meta: [{ title: `${BLADE.name} · Blade ${BLADE.n}` }, { name: "description", content: BLADE.tagline }] }),
  component: () => <BladeStandby blade={BLADE} />,
});
