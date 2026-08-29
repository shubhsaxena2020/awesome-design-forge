import { describe, it, expect } from "vitest";
import { isBrandSpec } from "../design-parser.ts";

/**
 * `isBrandSpec` is the gate that keeps non-brand .md files (placeholder
 * READMEs that point to an external site, prose docs with no tokens) out of the
 * baked brand registry. These tests lock that behavior so the corpus bake never
 * re-accumulates phantom `readme-md` / `Unknown` brands.
 */

describe("isBrandSpec — corpus gate", () => {
  it("accepts a front-matter spec with name/colors/typography", () => {
    const spec = `---\nname: Figma\ndescription: x\ncolors:\n  primary: "#000"\ntypography:\n  body:\n    fontFamily: Inter\n---\n`;
    expect(isBrandSpec(spec)).toBe(true);
  });

  it("accepts a prose 'design system / brand analysis' doc", () => {
    const prose = "# Design System Inspired by Kraken\n\nKraken uses purple...";
    expect(isBrandSpec(prose)).toBe(true);
  });

  it("rejects placeholder READMEs that defer to an external site", () => {
    const placeholder =
      "# Airbnb Inspired Design System Analysis\n\n" +
      "Design system details have been moved to: https://getdesign.md/airbnb/design-md\n\n" +
      "You can also view previews on getdesign.md.";
    expect(isBrandSpec(placeholder)).toBe(false);
  });

  it("rejects empty / prose-with-no-brand-heading docs", () => {
    expect(isBrandSpec("")).toBe(false);
    expect(isBrandSpec("# Meeting Notes\n\n- todo")).toBe(false);
    expect(isBrandSpec("just some text without a heading")).toBe(false);
  });
});
