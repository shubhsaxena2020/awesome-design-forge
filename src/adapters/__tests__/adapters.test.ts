import { describe, it, expect } from "vitest";
import { materialToDesignSpec, flatToDesignSpec } from "../../adapters/material-shim.ts";
import { validateDesignSpec } from "../../parser/validate.ts";
import type { DesignSpec } from "../../spec/types.ts";

describe("adapters/shims: roadmap #5", () => {
  const mat = {
    id: "md-example",
    name: "Material Example",
    primary: "#6750a4",
    primaryContainer: "#eaddff",
    onPrimary: "#ffffff",
    surface: "#fffbff",
    onSurface: "#1b1b1f",
    error: "#b3261e",
    outline: "#79747e",
  };

  it("materialToDesignSpec maps MD3 tokens to canonical roles", () => {
    const s = materialToDesignSpec(mat);
    expect(s.colors.primary).toBe("#6750a4");
    expect(s.colors.background).toBe("#fffbff");
    expect(s.colors.foreground).toBe("#1b1b1f");
    expect(s.colors.destructive).toBe("#b3261e");
    expect(s.colors.border).toBe("#79747e");
  });

  it("adapter output is STABLE for the same input", () => {
    const a = materialToDesignSpec(mat);
    const b = materialToDesignSpec(mat);
    expect(a).toEqual(b);
    // JSON-stable (canonical serialization)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("material shim infers sensible defaults when optional fields are absent", () => {
    const s = materialToDesignSpec({ id: "x", primary: "#123456" });
    expect(s.colors.background).toBe("#ffffff");
    expect(s.colors.onPrimary).toBe("#ffffff");
    expect(s.typography.heading.fontFamily).toBe("Roboto");
    expect(s.elevation.radius).toBe("1rem");
  });

  it("flatToDesignSpec maps a positional hex palette", () => {
    const s = flatToDesignSpec("flat-1", ["#0b0b0b", "#fafafa", "#2563eb", "#64748b", "#7c3aed", "#f1f5f9", "#dc2626", "#e2e8f0"]);
    expect(s.colors.background).toBe("#0b0b0b");
    expect(s.colors.primary).toBe("#2563eb");
    expect(s.colors.accent).toBe("#7c3aed");
    expect(s.colors.destructive).toBe("#dc2626");
  });

  it("flat shim is stable and falls back for short palettes", () => {
    const a = flatToDesignSpec("f", ["#000", "#fff", "#f00"]);
    const b = flatToDesignSpec("f", ["#000", "#fff", "#f00"]);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.colors.secondary).toBe("#f00"); // falls back to primary
  });

  it("produced specs pass the strict validator (no silent bad output)", () => {
    const s: DesignSpec = materialToDesignSpec(mat);
    expect(validateDesignSpec(s)).toHaveLength(0);
  });
});
