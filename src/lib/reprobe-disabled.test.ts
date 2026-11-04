import { describe, expect, it, vi } from "vitest";
import { reprobeDisabledResponse } from "./reprobe-disabled";

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
}));

describe("disabled public reprobe endpoint", () => {
  it("returns an explicit non-cacheable 410 response", async () => {
    const response = reprobeDisabledResponse();
    expect(response.status).toBe(410);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ ok: false, error: "reprobe_disabled" });
  });

  it("disables GET and POST without external probes or privileged client imports", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Unexpected external probe"));
    const adminImport = vi.fn(() => { throw new Error("Unexpected privileged client import"); });
    vi.doMock("@/integrations/supabase/client.server", adminImport);
    try {
      const { Route } = await import("@/routes/api/public/hooks/reprobe");
      const route = Route as unknown as { server: { handlers: { GET: () => Response; POST: () => Response } } };
      expect(route.server.handlers.GET().status).toBe(410);
      expect(route.server.handlers.POST().status).toBe(410);
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(adminImport).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
      vi.doUnmock("@/integrations/supabase/client.server");
    }
  });
});