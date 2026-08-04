// Inbound webhook receiver for the NEXINUS API Gateway.
//
//   POST /api/public/hooks/nexinus
//
// Verification order (fail closed):
//   1. NEXINUS_WEBHOOK_SECRET must be configured server-side  -> 503 if absent
//   2. Body must parse and match the event envelope shape     -> 400
//   3. Signature must verify against the RAW body (or the     -> 401
//      gateway's documented sha256(canonical+secret) digest)
//   4. Timestamp must be within age/skew bounds               -> 400
//
// A verified event is recorded as QUARANTINED. That is deliberate and final
// for this transport: a shared secret authenticates the *sender*, it does not
// make the *claim* true. Nothing written here feeds the ledger, the Golden
// Truth manifest, or any mint path. Promotion to COUPLED requires an
// ARCHANGEL/v0 signed payload from a pinned Ed25519 key on a stable host.

import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import {
  verifyInbound,
  timestampState,
  type NexinusEvent,
} from "@/lib/federation-hmac";

const KNOWN_TYPES = new Set([
  "truth.verified",
  "identity.registered",
  "credential.issued",
  "milestone.achieved",
  "webhook.test",
]);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Nexinus-Signature, X-Nexinus-Node",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function isEvent(v: unknown): v is NexinusEvent {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o["id"] === "string" &&
    o["id"].length > 0 &&
    o["id"].length <= 200 &&
    typeof o["type"] === "string" &&
    typeof o["timestamp"] === "string" &&
    "data" in o
  );
}

export const Route = createFileRoute("/api/public/hooks/nexinus")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      POST: async ({ request }) => {
        const secret = process.env["NEXINUS_WEBHOOK_SECRET"];
        if (!secret) {
          return json({ error: "webhook_secret_not_configured" }, 503);
        }

        const raw = await request.text();
        if (raw.length > 256_000) return json({ error: "payload_too_large" }, 413);

        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          return json({ error: "bad_json" }, 400);
        }
        if (!isEvent(parsed)) return json({ error: "bad_envelope" }, 400);

        const scheme = verifyInbound(
          raw,
          parsed,
          request.headers.get("x-nexinus-signature"),
          secret,
        );
        if (!scheme) return json({ error: "bad_signature" }, 401);

        const tsProblem = timestampState(parsed.timestamp);
        if (tsProblem) return json({ error: tsProblem }, 400);

        const nodeId = request.headers.get("x-nexinus-node")?.slice(0, 120) ?? null;
        const supabase = createClient(
          process.env["SUPABASE_URL"]!,
          process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
        );

        // Idempotent: a retried event with the same id is a no-op.
        const { error } = await supabase.from("federation_events").upsert(
          {
            event_id: parsed.id,
            node_id: nodeId,
            event_type: parsed.type,
            emitted_at: parsed.timestamp,
            state: "QUARANTINED",
            reason: KNOWN_TYPES.has(parsed.type)
              ? `authenticated_via_${scheme}; unpinned_sender`
              : `unknown_event_type; authenticated_via_${scheme}`,
            payload: parsed,
          },
          { onConflict: "event_id", ignoreDuplicates: true },
        );
        if (error) return json({ error: "store_failed" }, 500);

        if (nodeId) {
          await supabase
            .from("federation_peers_registry")
            .update({ last_seen_at: new Date().toISOString() })
            .eq("node_id", nodeId);
        }

        return json(
          {
            received: true,
            id: parsed.id,
            state: "QUARANTINED",
            note: "Authenticated by shared secret. Not coupled: claim is not admitted to the ledger without an ARCHANGEL/v0 signature from a pinned key.",
          },
          200,
        );
      },
    },
  },
});
