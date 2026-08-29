import * as React from "react";
import { getBrand, loadAllBrands } from "../../../src/brands/tokens.ts";
import { emitThemeCss } from "../../../src/generators/css-variables.ts";
import { Button, Card, Input, Navbar, NavLink } from "./ui.tsx";

const FONT_STACK: Record<string, string> = {};
function gfont(name: string): string {
  return FONT_STACK[name] ?? name.split(/[ ,]+/)[0];
}

/** Resolve a brand by id from built-in + baked ingested specs (fs-free). */
function resolveBrand(id: string) {
  const { brands } = loadAllBrands();
  return brands.find((b) => b.id === id) ?? getBrand(id);
}

export function Showroom({ brandId }: { brandId: string }) {
  const brand = resolveBrand(brandId);
  const [dark, setDark] = React.useState(true);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [val, setVal] = React.useState("");

  // Inject the GENERATED theme css (req 6) into the document.
  React.useEffect(() => {
    const id = "df-theme";
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = emitThemeCss(brand);
  }, [brand]);

  // Toggle .dark on <html> for the dark-mode override.
  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  // Load the brand fonts (Google Fonts) so typography specimens render for real.
  React.useEffect(() => {
    const fams = [gfont(brand.typography.heading), gfont(brand.typography.body)]
      .map((f) => f.replace(/ /g, "+"))
      .join("&family=");
    const href = `https://fonts.googleapis.com/css2?family=${fams}&display=swap`;
    let l = document.querySelector('link[data-df-fonts]') as HTMLLinkElement | null;
    if (!l) {
      l = document.createElement("link");
      l.rel = "stylesheet";
      l.setAttribute("data-df-fonts", "");
      document.head.appendChild(l);
    }
    l.href = href;
  }, [brand]);

  const palette = [
    ["primary", brand.colors.primary],
    ["secondary", brand.colors.secondary],
    ["accent", brand.colors.accent],
    ["background", brand.colors.background],
    ["foreground", brand.colors.foreground],
    ["muted", brand.colors.muted],
    ["destructive", brand.colors.destructive],
    ["border", brand.colors.border],
  ] as const;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar brand={`${brand.name}`}>
        <NavLink href="#">Docs</NavLink>
        <NavLink href="#">Pricing</NavLink>
        <Button size="sm" variant="primary" onClick={() => setModalOpen(true)}>
          Open modal
        </Button>
        <Button size="sm" variant="outline" onClick={() => setDark((d) => !d)}>
          {dark ? "Light" : "Dark"}
        </Button>
      </Navbar>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <header className="mb-10">
          <p className="text-sm text-muted-foreground">design-forge preview · brand</p>
          <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
            {brand.name}
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{brand.description}</p>
        </header>

        {/* Typography specimens */}
        <section className="mb-10">
          <h2 className="mb-3 text-xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
            Typography
          </h2>
          <div className="space-y-3 rounded-[var(--radius)] border border-border p-5">
            <div style={{ fontFamily: "var(--font-heading)" }}>
              <div className="text-3xl font-bold">Heading 3xl · {brand.typography.heading}</div>
              <div className="text-xl font-semibold">Heading x1 · {brand.typography.heading}</div>
            </div>
            <p style={{ fontFamily: "var(--font-body)" }} className="text-base">
              Body text · {brand.typography.body} — The quick brown fox jumps over the lazy dog.
              1234567890 — Lorem ipsum dolor sit amet, consectetur adipiscing elit.
            </p>
            <p className="text-sm text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>
              Small / muted text sample.
            </p>
          </div>
        </section>

        {/* Color palette */}
        <section className="mb-10">
          <h2 className="mb-3 text-xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
            Color palette
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {palette.map(([name, hex]) => (
              <div key={name} className="overflow-hidden rounded-[var(--radius)] border border-border">
                <div className="h-16" style={{ background: hex }} />
                <div className="p-2 text-xs">
                  <div className="font-medium capitalize">{name}</div>
                  <div className="text-muted-foreground">{hex}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Interactive UI kit */}
        <section className="mb-10">
          <h2 className="mb-3 text-xl font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
            UI kit
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-5">
              <h3 className="mb-3 text-lg font-semibold">Buttons</h3>
              <div className="flex flex-wrap gap-2">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button disabled>Disabled</Button>
              </div>
            </Card>
            <Card className="p-5">
              <h3 className="mb-3 text-lg font-semibold">Inputs</h3>
              <div className="space-y-2">
                <Input placeholder="Email address" value={val} onChange={(e) => setVal(e.target.value)} />
                <Input placeholder="Disabled" disabled />
                <p className="text-sm text-muted-foreground">You typed: {val || "—"}</p>
              </div>
            </Card>
          </div>
        </section>

        {/* Modal (Radix Dialog) */}
        {modalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setModalOpen(false)}
          >
            <div
              className="w-full max-w-md rounded-[var(--radius)] border border-border bg-card p-5 text-card-foreground shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="mb-2 text-lg font-semibold">Modal title</h3>
              <p className="text-sm text-muted-foreground">
                This dialog shows the {brand.name} theme applied to a brand-themed modal primitive.
              </p>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setModalOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => setModalOpen(false)}>Confirm</Button>
              </div>
            </div>
          </div>
        )}

        <footer className="mt-12 border-t border-border pt-4 text-xs text-muted-foreground">
          All {loadAllBrands().brands.length} reference brands available via{" "}
          <code className="rounded bg-muted px-1">?brand=ID</code> · theme compiled from generated CSS vars.
        </footer>
      </main>
    </div>
  );
}
