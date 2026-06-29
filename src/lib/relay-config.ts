// Optional sovereign OTS relay. The browser cannot reach calendar.eternitywall
// et al. directly (no CORS). If the operator runs their own tiny relay that
// forwards POST /digest → calendars and returns the .ots bytes, they can
// register its URL here. We never hardcode third-party relays.
//
// Expected relay contract (operator-owned, on Valkyrie or equivalent):
//   POST {url}/stamp   body: { sha256: "<64-hex>" }
//   200  body: { ots_base64: "<base64 of .ots bytes>" }
//
// Anything else is rejected and the wizard falls back to local-drop mode.

import { kvGet, kvSet } from "@/lib/sovereign-store";

const KEY = "nexinus.ots.relay.v1";

export function getRelayUrl(): string | null {
  try {
    const v = kvGet(KEY);
    return v && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}

export function setRelayUrl(url: string): void {
  const trimmed = url.trim();
  if (trimmed) new URL(trimmed); // throws if invalid
  kvSet(KEY, trimmed);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("nexinus:relay"));
  }
}

export function clearRelayUrl(): void {
  kvSet(KEY, "");
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("nexinus:relay"));
  }
}

export async function stampViaRelay(sha256Hex: string): Promise<Uint8Array> {
  const url = getRelayUrl();
  if (!url) throw new Error("no relay configured");
  const res = await fetch(`${url.replace(/\/$/, "")}/stamp`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sha256: sha256Hex.toLowerCase() }),
  });
  if (!res.ok) throw new Error(`relay ${res.status}`);
  const body = (await res.json()) as { ots_base64?: string };
  if (!body.ots_base64) throw new Error("relay returned no ots_base64");
  const bin = atob(body.ots_base64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
