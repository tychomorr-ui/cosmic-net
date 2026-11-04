/** Gate 1 safety boundary: no network probes or privileged storage access. */
export function reprobeDisabledResponse(): Response {
  return Response.json(
    { ok: false, error: "reprobe_disabled", detail: "Scheduled reprobe is disabled pending authenticated operator-controlled replacement." },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}