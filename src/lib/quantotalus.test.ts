import { describe, it, expect } from "vitest";
import { triadState } from "./quantotalus";
const p = (id: string, up: boolean, ms = 100) => ({ id, state: up ? "REACHABLE" as const : "DOWN" as const, ms });
describe("triadState", () => {
  it("is UNMEASURED without all three probes", () => {
    expect(triadState([p("tesseract", true)]).state).toBe("UNMEASURED");
    expect(triadState(undefined).state).toBe("UNMEASURED");
  });
  it("is COHERENT only when all three answer", () => {
    const r = triadState([p("tesseract", true, 100), p("rootgate", true, 250), p("truthtalk", true, 400)]);
    expect(r.state).toBe("COHERENT");
    expect(r.spreadMs).toBe(300);
  });
  it("is DEGRADED with one down and BROKEN with all down", () => {
    expect(triadState([p("tesseract", true), p("rootgate", false), p("truthtalk", true)]).state).toBe("DEGRADED");
    expect(triadState([p("tesseract", false), p("rootgate", false), p("truthtalk", false)]).state).toBe("BROKEN");
  });
});
