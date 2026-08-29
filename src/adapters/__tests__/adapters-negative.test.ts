import { describe, it, expect } from "vitest";
import { materialToDesignSpec, flatToDesignSpec } from "../../adapters/material-shim.ts";
import { validateDesignSpec } from "../../parser/validate.ts";
import { getBrand } from "../../brands/tokens.ts";

/**
 * Backlog B5: negative paths for the brand adapters/shims (#5).
 * The shims must stay SAFE under hostile / incomplete input: they should never
 * throw, should always produce a spec that the strict validator accepts (no
 * silent bad output), and unknown-brand lookups must fail loudly and clearly.
 */
describe("adapters/shims negative paths (backlog B5)", () => {
  it("materialToDesignSpec tolerates an empty/garbage object without throwing", () => {
    expect(() => materialToDesignSpec({} as never)).not.toThrow();
    // @ts-expect-error intentionally wrong type
    expect(() => materialToDesignSpec({ primary: 123 })).not.toThrow();
  });

  it("materialToDesignSpec never emits an invalid CSS color on partial input", () => {
    const s = materialToDesignSpec({ id: "neg", primary: "#123456" });
    expect(validateDesignSpec(s)).toHaveLength(0);
  });

  it("materialToDesignSpec propagates a malformed radius and the validator catches it (no silent bad output)", () => {
    const s = materialToDesignSpec({ id: "neg2", primary: "#123456", radius: "not-a-length" });
    const errors = validateDesignSpec(s);
    expect(errors.some((e) => e.path === "elevation.radius")).toBe(true);
  });

  it("flatToDesignSpec fills a short palette without throwing and stays valid", () => {
    expect(() => flatToDesignSpec("f", ["#000", "#fff"])).not.toThrow();
    const s = flatToDesignSpec("f", ["#000", "#fff"]);
    expect(validateDesignSpec(s)).toHaveLength(0);
    // missing positions fall back (not undefined) so no required color is empty
    expect(s.colors.accent).toBeTruthy();
  });

  it("flatToDesignSpec tolerates a totally empty palette", () => {
    const s = flatToDesignSpec("empty", []);
    expect(validateDesignSpec(s)).toHaveLength(0);
  });

  it("getBrand throws a clear Unknown brand error for a missing id", () => {
    expect(() => getBrand("definitely-not-a-real-brand-xyz")).toThrow(/Unknown brand/);
  });

  it("getBrand error lists known brands so the caller can self-correct", () => {
    let msg = "";
    try {
      getBrand("nope");
    } catch (e) {
      msg = (e as Error).message;
    }
    expect(msg).toContain("known:");
    expect(msg).toContain("aurora");
  });
});
