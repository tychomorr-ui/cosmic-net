// PostHog analytics — browser-only init. Public project key, direct to us.posthog.com (no proxy).
import posthog from "posthog-js";

const KEY = "phc_vdyBKwDor5txSpfyXooMKH3tn95S8iZa85krL2sYMQX3";
const HOST = "https://us.posthog.com";

let initialized = false;

export function initPostHog(): typeof posthog | null {
  if (typeof window === "undefined") return null;
  if (initialized) return posthog;
  posthog.init(KEY, {
    api_host: HOST,
    capture_pageview: false, // we capture manually on TanStack route change
    capture_pageleave: true,
    autocapture: true,
    session_recording: { maskAllInputs: false },
    disable_session_recording: false,
            persistence: "localStorage+cookie",
  });
  initialized = true;
  return posthog;
}

export { posthog };
