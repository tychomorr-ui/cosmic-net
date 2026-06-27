import { createFileRoute } from "@tanstack/react-router";
import { serve } from "inngest/edge";
import { inngest } from "@/lib/inngest";
import { functions } from "@/lib/inngest.functions";

// Serve endpoint for Inngest. The SDK reads INNGEST_SIGNING_KEY
// from the runtime to verify incoming requests.
const handler = serve({ client: inngest, functions });

export const Route = createFileRoute("/api/inngest")({
  server: {
    handlers: {
      GET: async ({ request }) => handler(request),
      POST: async ({ request }) => handler(request),
      PUT: async ({ request }) => handler(request),
    },
  },
});
