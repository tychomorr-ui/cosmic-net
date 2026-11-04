import { createFileRoute } from "@tanstack/react-router";
import { reprobeDisabledResponse } from "@/lib/reprobe-disabled";

// Gate 1: this public endpoint must not trigger external probes, access the
// privileged client, or expose private probe rows. Existing callers receive
// an explicit disabled response until a secured replacement is authorized.
export const Route = createFileRoute("/api/public/hooks/reprobe")({
  server: {
    handlers: {
      POST: reprobeDisabledResponse,
      GET: reprobeDisabledResponse,
    },
  },
});
