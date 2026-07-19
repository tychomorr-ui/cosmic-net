import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireActiveSubscription } from "../subscription-gate";

const SHA256_RE = /^[0-9a-f]{64}$/i;

const CALENDARS = [
  "https://alice.btc.calendar.opentimestamps.org",
  "https://bob.btc.calendar.opentimestamps.org",
  "https://finney.calendar.eternitywall.com",
];

async function submitToCalendar(url: string, digest: Uint8Array) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${url}/digest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        Accept: "application/vnd.opentimestamps.v1",
      },
      body: new Uint8Array(digest),


      signal: controller.signal,
    });
    if (!res.ok) {
      return { url, ok: false, status: res.status, error: `HTTP ${res.status}` };
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    const b64 =
      typeof Buffer !== "undefined"
        ? Buffer.from(buf).toString("base64")
        : btoa(String.fromCharCode(...buf));
    return { url, ok: true, status: res.status, fragment_b64: b64, bytes: buf.length };
  } catch (e: any) {
    return { url, ok: false, error: e?.message ?? String(e) };
  } finally {
    clearTimeout(timer);
  }
}

export default defineTool({
  name: "provenance_ots_stamp",
  title: "OTS-stamp provenance hash",
  description:
    "Submit a SHA-256 hash to public OpenTimestamps calendars for Bitcoin anchoring, then " +
    "record the calendar receipts on the caller's account. Returns a receipt with the calendar " +
    "responses; Bitcoin block inclusion happens later (poll `ots verify` upstream). Requires an " +
    "active cMAP MCP subscription.",
  inputSchema: {
    sha256: z
      .string()
      .regex(SHA256_RE, "Must be a 64-char hex SHA-256 digest.")
      .describe("Lowercase hex SHA-256 digest of the artifact to stamp."),
    label: z
      .string()
      .max(200)
      .optional()
      .describe("Optional human-readable label for the artifact."),
  },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: true },
  handler: async ({ sha256, label }, ctx) => {
    const gate = await requireActiveSubscription(ctx);
    if (!gate.ok) return gate.response;

    const digest = new Uint8Array(
      sha256.match(/.{2}/g)!.map((h) => parseInt(h, 16)),
    );
    const results = await Promise.all(CALENDARS.map((c) => submitToCalendar(c, digest)));
    const anyOk = results.some((r) => r.ok);

    const admin = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data, error } = await admin
      .from("stamps")
      .insert({
        user_id: gate.userId,
        sha256: sha256.toLowerCase(),
        label: label ?? null,
        kind: "ots",
        status: anyOk ? "submitted" : "failed",
        calendars: results,
        client_id: ctx.getClientId?.() ?? null,
      })
      .select("id, sha256, label, kind, status, calendars, created_at")
      .single();

    if (error) {
      return {
        content: [{ type: "text", text: `Failed to persist stamp: ${error.message}` }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { stamp: data },
    };
  },
});
