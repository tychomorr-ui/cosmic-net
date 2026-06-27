import { Inngest } from "inngest";

// Sovereign Console event bus.
// Inngest is the durable execution layer for:
//   - ingest fan-out (verify HMAC → persist → IPFS pin → witness)
//   - hourly merkle rollup of attestations
//   - fleet liveness sweep (ed25519 probes)
//   - OODA phase transitions (396Hz → 741Hz)
export const inngest = new Inngest({ id: "sovereign-console" });

const GATEWAY_URL = "https://connector-gateway.lovable.dev/inngest";

/**
 * Emit an event through the Lovable connector gateway.
 * Server-only — do not call from the browser.
 */
export async function sendInngestEvent(
  name: string,
  data: Record<string, unknown>,
) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const inngestKey = process.env.INNGEST_API_KEY;
  if (!lovableKey) throw new Error("LOVABLE_API_KEY is not configured");
  if (!inngestKey) throw new Error("INNGEST_API_KEY is not configured");

  const res = await fetch(`${GATEWAY_URL}/e/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": inngestKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, data }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Inngest emit failed [${res.status}]: ${body}`);
  }
  return res.json();
}
