import { describe, it, expect } from "vitest";
import { triadState } from "./quantotalus";
const p = (id: string, up: boolean, ms = 100) => ({ id, state: up ? "REACHABLE" as const : "DOWN" as const, ms });
describe("triadState", () => {
  it("is UNMEASURED without all three probes", () => {
    expect(triadState([p("root-gate", true)]).state).toBe("UNMEASURED");
    expect(triadState(undefined).state).toBe("UNMEASURED");
  });
  it("is COHERENT only when all three answer", () => {
    const r = triadState([p("root-gate", true, 100), p("xinus-clarity", true, 250), p("kether-gate", true, 400)]);
    expect(r.state).toBe("COHERENT");
    expect(r.spreadMs).toBe(300);
  });
  it("is DEGRADED with one down and BROKEN with all down", () => {
    expect(triadState([p("root-gate", true), p("xinus-clarity", false), p("kether-gate", true)]).state).toBe("DEGRADED");
    expect(triadState([p("root-gate", false), p("xinus-clarity", false), p("kether-gate", false)]).state).toBe("BROKEN");
  });
});
