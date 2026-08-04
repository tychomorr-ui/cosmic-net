// Self-registration endpoint for external gateways.
//
//   POST /api/public/hooks/nexinus/register
//
// Authenticated by the same shared secret (HMAC-SHA256 over the raw body in
// X-Nexinus-Signature). Registration records a CLAIM, nothing more. `coupled`
// is always false here and can only be flipped by pinning the node's Ed25519
// key in src/data/nodes.ts and having its signed /status verify.

import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { bodyHmac, safeEqualHex } from "@/lib/federation-hmac";
import { z } from "zod";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Nexinus-Signature",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

const Schema = z.object({
  node_id: z.string().min(3).max(120).regex(/^[a-z0-9][a-z0-9._-]*$/i),
  webhook_url: z.string().max(2048).regex(/^https:\/\/[^\s]+$/i),
  ed25519_pub: z.string().regex(/^[0-9a-f]{64}$/i).optional(),
  claims: z.record(z.string(), z.unknown()).optional(),
});

export const Route = createFileRoute("/api/public/hooks/nexinus/register")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      POST: async ({ request }) => {
        const secret = process.env["NEXINUS_WEBHOOK_SECRET"];
        if (!secret) return json({ error: "webhook_secret_not_configured" }, 503);

        const raw = await request.text();
        if (raw.length > 32_000) return json({ error: "payload_too_large" }, 413);

        const sig = request.headers.get("x-nexinus-signature");
        if (!sig || !safeEqualHex(sig, bodyHmac(raw, secret))) {
          return json({ error: "bad_signature" }, 401);
        }

        let body: z.infer<typeof Schema>;
        try {
          body = Schema.parse(JSON.parse(raw));
        } catch {
          return json({ error: "bad_request" }, 400);
        }

        const supabase = createClient(
          process.env["SUPABASE_URL"]!,
          process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
        );
        const { error } = await supabase.from("federation_peers_registry").upsert(
          {
            node_id: body.node_id,
            webhook_url: body.webhook_url,
            ed25519_pub: body.ed25519_pub?.toLowerCase() ?? null,
            claims: body.claims ?? {},
            coupled: false,
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: "node_id" },
        );
        if (error) return json({ error: "store_failed" }, 500);

        return json(
          {
            registered: true,
            node_id: body.node_id,
            coupled: false,
            blocker:
              "Registered as a claimant, not a witness. Coupling requires a stable TLS host serving an ARCHANGEL/v0 signed /status whose re-derived CID matches, with its Ed25519 key pinned here.",
          },
          200,
        );
      },
    },
  },
});
