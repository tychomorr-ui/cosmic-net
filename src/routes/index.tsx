import { createFileRoute } from "@tanstack/react-router";
import { UplinkHeader } from "@/components/console/UplinkHeader";
import { AxisGrid } from "@/components/console/AxisGrid";
import { TesseractProjection } from "@/components/console/TesseractProjection";
import { StancePanel, ManifestationQueue } from "@/components/console/StancePanel";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NEXINUS · TERMINUS · Sovereign Console" },
      {
        name: "description",
        content:
          "Unified KETHER_GATE console for the NEXINUS mesh: TESSERACT-A / VALKYRIE / KETHER-GATE uplink, OMNI-SAM AXIS of 13 sovereign blades, and a live tesseract projection. Zero telemetry, real data or honest standby.",
      },
      { property: "og:title", content: "NEXINUS · TERMINUS · Sovereign Console" },
      {
        property: "og:description",
        content:
          "Witness, not control. 13-blade OMNI-SAM AXIS with live gateway probes.",
      },
    ],
  }),
  component: Console,
});

function Console() {
  return (
    <div>
      <UplinkHeader />

      <div className="mx-auto max-w-6xl space-y-10 px-6 py-10">
        <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded border border-border bg-card/40 p-5">
            <div className="flex items-baseline justify-between">
              <div className="text-[0.7rem] uppercase tracking-[0.22em] text-gold">
                tesseract substrate
              </div>
              <div className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                4-cube · live projection
              </div>
            </div>
            <div className="mt-4">
              <TesseractProjection size={360} />
            </div>
            <p className="mt-3 text-[0.7rem] text-muted-foreground">
              Geometric projection only. No fake metrics — wire a real metrics
              stream to render time-series here.
            </p>
          </div>

          <div className="space-y-6">
            <StancePanel />
            <ManifestationQueue />
          </div>
        </section>

        <AxisGrid />

        <footer className="border-t border-border pt-4 text-center text-[0.65rem] uppercase tracking-[0.24em] text-muted-foreground">
          SOVEREIGN CONSOLE · ZERO TELEMETRY · NO THIRD-PARTY MIDDLEWARE
        </footer>
      </div>
    </div>
  );
}
