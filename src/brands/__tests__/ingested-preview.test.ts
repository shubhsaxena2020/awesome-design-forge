import { describe, it, expect } from "vitest";
import { INGESTED } from "../../brands/ingested.ts";
import { emitThemeCss } from "../../generators/css-variables.ts";

const SHADCN_VARS = [
  "--background", "--foreground", "--card", "--card-foreground", "--popover",
  "--popover-foreground", "--primary", "--primary-foreground", "--secondary",
  "--secondary-foreground", "--muted", "--muted-foreground", "--accent",
  "--accent-foreground", "--destructive", "--destructive-foreground", "--border",
  "--input", "--ring", "--radius",
];

// Offline-verifiable tie between the preview's baked brands and the theme
// emitter: every ingested spec must produce a valid shadcn theme (light + dark)
// so the interactive showroom has correct CSS to inject.
describe("req 8 — every baked brand renders to a valid shadcn theme (preview source)", () => {
  it("bakes a non-trivial, de-duplicated brand set from design-md/", () => {
    expect(INGESTED.length).toBeGreaterThanOrEqual(8);
    const ids = new Set(INGESTED.map((b) => b.id));
    expect(ids.size).toBe(INGESTED.length); // no duplicate ids
  });

  for (const b of INGESTED) {
    it(`brand "${b.id}" -> valid :root + .dark shadcn vars`, () => {
      const css = emitThemeCss(b);
      expect(css).toContain(":root {");
      expect(css).toContain(".dark {");
      for (const v of SHADCN_VARS) {
        expect(css, `:root missing ${v}`).toContain(`${v}:`);
        expect(css, `.dark missing ${v}`).toContain(`${v}:`);
      }
    });
  }
});
