// Browser-side sovereignty probes. No server proxy, no telemetry leakage.
// MEASURED only on direct evidence; opaque success = REACHABLE, not HEALTHY.

export type ProbeStatus =
  | { state: "idle" }
  | { state: "probing"; at: number }
  | { state: "measured"; at: number; detail: string }
  | { state: "reachable"; at: number; detail: string }
  | { state: "unreachable"; at: number; detail: string };

export async function probeCorsJson(
  url: string,
  okField = "ok",
  timeoutMs = 4000,
): Promise<ProbeStatus> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  const at = Date.now();
  try {
    const res = await fetch(url, { mode: "cors", signal: ctl.signal, cache: "no-store" });
    if (!res.ok) return { state: "unreachable", at, detail: `HTTP ${res.status}` };
    const json = (await res.json()) as Record<string, unknown>;
    const ok = okField.split(".").reduce<unknown>((v, k) => (v && typeof v === "object" ? (v as Record<string, unknown>)[k] : undefined), json);
    if (ok === true) {
      return { state: "measured", at, detail: "ok:true" };
    }
    return { state: "reachable", at, detail: "200 · ok flag absent" };
  } catch (e) {
    return { state: "unreachable", at, detail: e instanceof Error ? e.message : "network error" };
  } finally {
    clearTimeout(timer);
  }
}

export async function probeOpaqueHead(url: string, timeoutMs = 4000): Promise<ProbeStatus> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  const at = Date.now();
  try {
    // no-cors HEAD: opaque success means the origin answered the request.
    await fetch(url, { mode: "no-cors", method: "HEAD", signal: ctl.signal, cache: "no-store" });
    return { state: "reachable", at, detail: "opaque success · health unverified" };
  } catch (e) {
    return { state: "unreachable", at, detail: e instanceof Error ? e.message : "network error" };
  } finally {
    clearTimeout(timer);
  }
}
