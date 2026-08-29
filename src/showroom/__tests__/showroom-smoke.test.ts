import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import { Showroom } from "../../../packages/preview/src/Showroom.tsx";

/**
 * Backlog B8: a showroom render smoke test.
 * Renders the real `<Showroom>` (the same component the preview serves) for a
 * brand via `react-dom/server` — no browser needed. Asserts it produces the
 * expected UI shell (brand name, palette swatches, UI kit) and never throws,
 * including for a brand that uses `{token}` references (linear-dark).
 */
describe("showroom render smoke test (backlog B8)", () => {
  it("renders a built-in brand without throwing and emits the UI shell", () => {
    const html = renderToStaticMarkup(React.createElement(Showroom, { brandId: "aurora" }));
    expect(html).toContain("design-forge preview");
    expect(html).toContain("Aurora"); // brand name heading
    expect(html).toContain("Color palette");
    expect(html).toContain("UI kit");
    expect(html).toContain("Primary"); // generated output button
  });

  it("renders an ingested brand that uses {token} references (linear-dark)", () => {
    const html = renderToStaticMarkup(React.createElement(Showroom, { brandId: "linear-dark" }));
    expect(html).toContain("Linear Dark");
    expect(html).toContain("Color palette");
    // the brand's primary resolves through token refs to a concrete hex
    expect(html).toContain("#5e6ad2");
  });

  it("renders the token-diff view for a pair of brands", () => {
    const html = renderToStaticMarkup(
      React.createElement(Showroom, { brandId: "aurora", diffPair: ["aurora", "ember"] as [string, string] }),
    );
    expect(html).toContain("Token diff:");
    expect(html).toContain("changed");
  });
});
