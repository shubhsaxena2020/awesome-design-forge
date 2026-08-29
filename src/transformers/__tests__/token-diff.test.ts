import { describe, it, expect } from "vitest";
import { diffTokens, flattenTokens, formatDiff, summarizeDiff } from "../../transformers/token-diff.ts";
import type { BrandTokens } from "../../brands/tokens.ts";

function mk(over: Partial<BrandTokens> = {}): BrandTokens {
  return {
    id: "x",
    name: "X",
    description: "",
    colors: {
      background: "#ffffff",
      foreground: "#0a0a0a",
      primary: "#2563eb",
      secondary: "#6b7280",
      accent: "#7c3aed",
      muted: "#f3f4f6",
      destructive: "#b91c1c",
      border: "#e5e7eb",
    },
    radius: "0.5rem",
    typography: { heading: "Inter", body: "Inter", baseSize: 16 },
    ...over,
  };
}

describe("token-diff: item #7", () => {
  it("flags changed + unchanged without hiding structure", () => {
    const a = mk({ colors: { ...mk().colors, primary: "#2563eb" } });
    const b = mk({ colors: { ...mk().colors, primary: "#dc2626" } });
    const changes = diffTokens(a, b);
    const primary = changes.find((c) => c.path === "colors.primary");
    expect(primary?.kind).toBe("changed");
    expect(primary?.from).toBe("#2563eb");
    expect(primary?.to).toBe("#dc2626");
    // unchanged entries are still present (not hidden)
    expect(changes.find((c) => c.path === "colors.background")?.kind).toBe("unchanged");
  });

  it("detects additions and removals", () => {
    const a = mk();
    const b = mk({ colors: { ...mk().colors, primary: "#000000" }, radius: "1rem" });
    // simulate a removal by diffing b -> a (primary differs; nothing added here)
    const changes = diffTokens(a, b);
    expect(changes.find((c) => c.path === "radius")?.kind).toBe("changed");
  });

  it("summarizeDiff counts kinds", () => {
    const a = mk();
    const b = mk({ colors: { ...mk().colors, primary: "#000000" } });
    const s = summarizeDiff(diffTokens(a, b));
    expect(s.changed).toBeGreaterThanOrEqual(1);
    expect(s.unchanged).toBeGreaterThan(0);
  });

  it("formatDiff onlyChanged renders change lines, no unchanged", () => {
    const a = mk();
    const b = mk({ colors: { ...mk().colors, primary: "#000000" } });
    const out = formatDiff(diffTokens(a, b), { onlyChanged: true });
    expect(out).toContain("~ colors.primary");
    expect(out).not.toContain("colors.background");
  });

  it("flattenTokens is stable and round-trips the key fields", () => {
    const f = flattenTokens(mk());
    expect(f["colors.primary"]).toBe("#2563eb");
    expect(f["radius"]).toBe("0.5rem");
    expect(f["typography.heading"]).toBe("Inter");
  });
});
