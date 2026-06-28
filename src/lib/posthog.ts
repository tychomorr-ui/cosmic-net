// PostHog client — gated behind the sovereign telemetry switch.
// Only initialized when getTelemetryMode() === "posthog". Default is "off",
// so a fresh install ships with ZERO network egress to us.posthog.com.
//
// Local-only telemetry is handled by src/lib/telemetry.ts.

import posthog from "posthog-js";
import { getTelemetryMode, recordLocalEvent } from "@/lib/telemetry";

const KEY = "phc_vdyBKwDor5txSpfyXooMKH3tn95S8iZa85krL2sYMQX3";
const HOST = "https://us.posthog.com";

let initialized = false;

export function initPostHog(): typeof posthog | null {
  if (typeof window === "undefined") return null;
  if (getTelemetryMode() !== "posthog") return null;
  if (initialized) return posthog;
  posthog.init(KEY, {
    api_host: HOST,
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: true,
    session_recording: { maskAllInputs: false },
    disable_session_recording: false,
    persistence: "localStorage+cookie",
  });
  posthog.register({
    protocol: "cMAP",
    protocol_full: "Cosmic Mesh Alignment Protocol",
    app: "cmap-terminus",
  });
  initialized = true;
  return posthog;
}

/** Route-aware page-view capture honoring the telemetry mode. */
export function capturePageview(url: string): void {
  const mode = getTelemetryMode();
  if (mode === "posthog" && initialized) {
    posthog.capture("$pageview", { $current_url: url });
  } else if (mode === "local") {
    void recordLocalEvent({ ts: Date.now(), name: "$pageview", url });
  }
}

export { posthog };
