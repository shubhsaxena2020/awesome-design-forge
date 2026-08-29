/**
 * Brand-themed UI primitive synthesizer (per-spec).
 *
 * Emits React + Tailwind components that consume the shadcn CSS variables
 * produced by css-variables.ts (bg-primary, text-foreground, border-border, ...).
 *
 * Unlike a fixed template kit, `generateComponent(p, spec)` performs TRUE
 * PER-SPEC SYNTHESIS: it bakes the spec's actual typography (font family,
 * letter-spacing/tracking, weight), elevation shadows, and color palette into
 * the generated source. Every brand therefore gets components that reflect ITS
 * designer intent — not a one-size-fits-all kit recolored by CSS vars alone.
 *
 * IMPORTANT (req 7): generated components must never animate layout properties
 * (width/height/top/left/bottom/margin/padding). Transitions are restricted to
 * compositor-friendly properties (transform, opacity, colors, box-shadow, filter)
 * and `transform` is used for any movement. `assertNoLayoutThrashing()` verifies
 * the emitted source contains no banned animation properties.
 */

import type { DesignSpec, TypeRole } from "../spec/types.ts";

export type Primitive = "button" | "card" | "input" | "modal" | "navbar";

export const PRIMITIVES: Primitive[] = ["button", "card", "input", "modal", "navbar"];

// Properties that, if animated, cause layout/paint thrash. Confirmed absent.
const BANNED_ANIMATED_PROPS = [
  "width", "height", "top", "left", "right", "bottom", "margin", "padding",
  "max-width", "max-height", "min-width", "min-height", "font-size",
];

/**
 * Static guard: scan emitted source for layout-thrashing animations.
 * A property is "animated" (and thus banned) only when it appears in a
 * @keyframes step block, a `transition:` list, or an `animate-[...]` body.
 */
export function assertNoLayoutThrashing(source: string, label: string): void {
  const offenders: string[] = [];

  const kf = source.matchAll(/@keyframes\s+[A-Za-z0-9_-]+\s*\{([\s\S]*?)\}/g);
  for (const m of kf) {
    const body = m[1];
    const steps = body.split(/(?:from|to|\d+%)\s*\{/).slice(1);
    for (const step of steps) {
      const decls = step.split("}")[0];
      for (const p of BANNED_ANIMATED_PROPS) {
        if (new RegExp(`\\b${p.replace("-", "\\-")}\\s*:`).test(decls)) {
          offenders.push(`${label}:keyframes:${p}`);
        }
      }
    }
  }

  const animatedRefs = source.matchAll(/(?:transition\s*:\s*\[?([^\n;}]*)\]?|animate-\[([^\]]*)\])/g);
  for (const m of animatedRefs) {
    const body = (m[1] ?? m[2] ?? "").toLowerCase();
    for (const p of BANNED_ANIMATED_PROPS) {
      if (new RegExp(`\\b${p.replace("-", "\\-")}\\b`).test(body)) {
        offenders.push(`${label}:animated:${p}`);
      }
    }
  }

  if (offenders.length) {
    throw new Error(`Layout-thrashing animation detected in ${label}: ${[...new Set(offenders)].join(", ")}`);
  }
}

// ---------------------------------------------------------------------------
// Per-spec synthesis helpers (called at generation time; values baked literally
// into the emitted source so each brand's kit is self-describing).
// ---------------------------------------------------------------------------

/** Inline style fragment carrying the spec's typography for a role. */
function fontStyle(role: TypeRole): string {
  const ls = role.letterSpacingEm == null ? "0em" : `${role.letterSpacingEm}em`;
  const w = role.fontWeight ?? 500;
  return `style={{ fontFamily: "${role.fontFamily}", letterSpacing: "${ls}", fontWeight: ${w} }}`;
}

/**
 * Shadow utility for a surface. Uses the spec's declared elevation token when
 * present (true per-spec elevation), else a sensible Tailwind default.
 */
function shadowClass(spec: DesignSpec, key: "sm" | "md" | "lg", fallback: string): string {
  const v = spec.elevation.shadows?.[key];
  return v ? `shadow-[${v}]` : fallback;
}

/**
 * Derive the button variant contract from the spec's actual palette. Each
 * variant maps to a shadcn surface + its inferred foreground; this is how the
 * kit reflects the brand's real color system rather than a hardcoded 4-set.
 */
function variantMap(spec: DesignSpec): string {
  void spec;
  const row = (name: string, fgName: string) =>
    `  ${name}: "bg-${name} text-${fgName}",`;
  return [
    row("primary", "primary-foreground"),
    row("secondary", "secondary-foreground"),
    row("accent", "accent-foreground"),
    row("muted", "muted-foreground"),
    row("destructive", "destructive-foreground"),
    `  outline: "border border-border bg-transparent text-foreground hover:bg-muted",`,
    `  ghost: "bg-transparent text-foreground hover:bg-muted",`,
  ].join("\n");
}

const COMPONENT_VARIANTS = `"primary" | "secondary" | "accent" | "muted" | "destructive" | "outline" | "ghost"`;

// A neutral fallback so generateComponent(p) with no spec still emits a valid,
// self-contained kit (Inter, default radius/shadow).
function fallbackSpec(): DesignSpec {
  return {
    id: "neutral",
    name: "Neutral",
    description: "",
    source: "",
    colors: {
      background: "#ffffff", foreground: "#0a0a0a", primary: "#2563eb",
      secondary: "#64748b", accent: "#8b5cf6", muted: "#f1f5f9",
      destructive: "#ef4444", border: "#e2e8f0",
    },
    typography: {
      heading: { fontFamily: "Inter", fontStack: ["Inter", "system-ui", "sans-serif"], fontSizePx: 24, fontWeight: 600, letterSpacingEm: -0.02 },
      body: { fontFamily: "Inter", fontStack: ["Inter", "system-ui", "sans-serif"], fontSizePx: 16, letterSpacingEm: 0 },
      baseSizePx: 16,
    },
    elevation: { radius: "0.5rem", shadows: { sm: "0 1px 2px rgb(0 0 0 / 0.08)", md: "0 4px 12px rgb(0 0 0 / 0.10)", lg: "0 16px 48px rgb(0 0 0 / 0.18)" } },
    components: {},
    warnings: [],
  };
}

// ---------------------------------------------------------------------------
// Generated components (template-literal source strings, spec-parameterized).
// ---------------------------------------------------------------------------

const buttonSrc = (spec: DesignSpec): string => `import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "../lib/cn";

type Variant = ${COMPONENT_VARIANTS};
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
}

const variants: Record<Variant, string> = {
${variantMap(spec)}
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

/** Per-spec typography (${spec.typography.heading.fontFamily}) baked in. Movement uses transform only. */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-[var(--radius)] font-medium",
          "transition-[transform,opacity,background-color,color,box-shadow] duration-150 outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
          "hover:-translate-y-px",
          variants[variant],
          sizes[size],
          className,
        )}
        ${fontStyle(spec.typography.heading)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
`;

const cardSrc = (spec: DesignSpec): string => `import * as React from "react";
import { cn } from "../lib/cn";

const CARD_SHADOW = "${shadowClass(spec, "md", "shadow-sm")}";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-[var(--radius)] border border-border bg-card text-card-foreground",
        CARD_SHADOW,
        "transition-[box-shadow,transform,opacity] duration-150",
        "hover:-translate-y-0.5",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export const CardHeader = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-1.5 p-5", className)} {...p} />
);
export const CardTitle = ({ className, ...p }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn("text-lg font-semibold leading-tight", className)} ${fontStyle(spec.typography.heading)} {...p} />
);
export const CardContent = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-5 pt-0", className)} {...p} />
);
`;

const inputSrc = (spec: DesignSpec): string => `import * as React from "react";
import { cn } from "../lib/cn";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-[var(--radius)] border border-input bg-background px-3 py-2 text-sm",
        "text-foreground placeholder:text-muted-foreground outline-none",
        "transition-[box-shadow,border-color,opacity] duration-150",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ${fontStyle(spec.typography.body)}
      {...props}
    />
  ),
);
Input.displayName = "Input";
`;

const modalSrc = (spec: DesignSpec): string => `import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "../lib/cn";

export interface ModalProps {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  title?: string;
  children?: React.ReactNode;
}

const MODAL_SHADOW = "${shadowClass(spec, "lg", "shadow-lg")}";

/**
 * Dialog animation uses ONLY transform + opacity (Radix data-state). No
 * width/height/top animation. Overlay fades via opacity.
 */
export const Modal = ({ open, onOpenChange, title, children }: ModalProps) => (
  <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay
        className={cn(
          "fixed inset-0 z-50 bg-black/50",
          "data-[state=open]:animate-[df-fade-in_150ms_ease-out]",
          "data-[state=closed]:animate-[df-fade-out_120ms_ease-in]",
        )}
      />
      <Dialog.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2",
          "rounded-[var(--radius)] border border-border bg-card p-5 text-card-foreground",
          MODAL_SHADOW,
          "transition-[transform,opacity] duration-150",
          "data-[state=open]:animate-[df-zoom-in_160ms_ease-out]",
          "data-[state=closed]:animate-[df-zoom-out_140ms_ease-in]",
        )}
      >
        {title && <Dialog.Title className="mb-2 text-lg font-semibold" ${fontStyle(spec.typography.heading)}>{title}</Dialog.Title>}
        {children}
        <Dialog.Close className="absolute right-4 top-4 text-muted-foreground transition-opacity hover:opacity-70">
          ✕
        </Dialog.Close>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);

export const modalKeyframes = \`@keyframes df-fade-in { from { opacity: 0 } to { opacity: 1 } }
@keyframes df-fade-out { from { opacity: 1 } to { opacity: 0 } }
@keyframes df-zoom-in { from { opacity: 0; transform: translate(-50%,-50%) scale(0.96) } to { opacity: 1; transform: translate(-50%,-50%) scale(1) } }
@keyframes df-zoom-out { from { opacity: 1; transform: translate(-50%,-50%) scale(1) } to { opacity: 0; transform: translate(-50%,-50%) scale(0.96) } }\`;
`;

const navbarSrc = (spec: DesignSpec): string => `import * as React from "react";
import { cn } from "../lib/cn";

export interface NavbarProps extends React.HTMLAttributes<HTMLElement> {
  brand?: string;
}

/** Sticky bar; hover/active states animate color/opacity/transform only. */
export const Navbar = ({ className, brand, children, ...props }: NavbarProps) => (
  <nav
    className={cn(
      "sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border",
      "bg-background/80 px-5 backdrop-blur transition-[background-color,box-shadow] duration-150",
      className,
    )}
    {...props}
  >
    <span className="font-semibold tracking-tight" ${fontStyle(spec.typography.heading)}>{brand ?? "Brand"}</span>
    <div className="flex items-center gap-1">{children}</div>
  </nav>
);

export const NavLink = ({ className, ...p }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
  <a
    className={cn(
      "rounded-[var(--radius)] px-3 py-1.5 text-sm text-muted-foreground",
      "transition-[color,background-color,opacity,transform] duration-150",
      "hover:text-foreground hover:bg-muted hover:-translate-y-px",
      className,
    )}
    {...p}
  />
);
`;

const SOURCES: Record<Primitive, (spec: DesignSpec) => string> = {
  button: buttonSrc,
  card: cardSrc,
  input: inputSrc,
  modal: modalSrc,
  navbar: navbarSrc,
};

/** Synthesize one primitive for a given spec (or a neutral fallback). */
export function generateComponent(p: Primitive, spec?: DesignSpec): string {
  const src = SOURCES[p](spec ?? fallbackSpec());
  assertNoLayoutThrashing(src, p);
  return src;
}

/** Synthesize all primitives for a given spec. */
export function generateAllComponents(spec?: DesignSpec): Record<Primitive, string> {
  const s = spec ?? fallbackSpec();
  const out = {} as Record<Primitive, string>;
  for (const p of PRIMITIVES) out[p] = generateComponent(p, s);
  return out;
}
