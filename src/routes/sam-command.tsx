import { createFileRoute, redirect } from "@tanstack/react-router";

// Retired surface: preserve old bookmarks without reviving Blade 08.
export const Route = createFileRoute("/sam-command")({
  beforeLoad: () => { throw redirect({ to: "/reflective-intel", replace: true }); },
});
