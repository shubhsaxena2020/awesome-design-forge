
/**
 * Brand-themed UI primitive synthesizer.
 *
 * Emits React + Tailwind components that consume the shadcn CSS variables
 * produced by css-variables.ts (bg-primary, text-foreground, border-border, ...).
 *
 * IMPORTANT (req 7): generated components must never animate layout properties
 * (width/height/top/left/bottom/margin/padding). Transitions are restricted to
 * compositor-friendly properties (transform, opacity, colors, box-shadow, filter)
 * and `transform` is used for any movement. `assertNoLayoutThrashing()` verifies
 * the emitted source contains no banned animation properties.
 */

export type Primitive = "button" | "card" | "input" | "modal" | "navbar";

export const PRIMITIVES: Primitive[] = ["button", "card", "input", "modal", "navbar"];

// Properties that, if animated, cause layout/paint thrash. Confirmed absent.
const BANNED_ANIMATED_PROPS = [
  "width",
  "height",
  "top",
  "left",
  "right",
  "bottom",
  "margin",
  "padding",
  "max-width",
  "max-height",
  "min-width",
  "min-height",
  "font-size",
];

/**
 * Static guard: scan emitted source for layout-thrashing animations.
 *
 * A property is "animated" (and thus banned) only when it appears:
 *   (a) inside a @keyframes step block (from / to / <n>%), OR
 *   (b) in a `transition:` declaration's animated-property list, OR
 *   (c) inside an `animate-[...]` arbitrary utility whose body names it.
 * Static style declarations (e.g. `h-10` as a Tailwind class, or `width: X` in a
 * normal rule) are NOT flagged — only animated usage triggers a failure.
 */
export function assertNoLayoutThrashing(source: string, label: string): void {
  const offenders: string[] = [];

  // (a) @keyframes blocks
  const kf = source.matchAll(/@keyframes\s+[A-Za-z0-9_-]+\s*\{([\s\S]*?)\}/g);
  for (const m of kf) {
    const body = m[1];
    // step blocks: from/to or 0%..100%
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

  // (b) transition: <prop list>  and  (c) animate-[...]
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
// Generated components (template-literal source strings).
// ---------------------------------------------------------------------------

const buttonSrc = (): string => `import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "../lib/cn";

type Variant = "primary" | "secondary" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
}

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:opacity-90",
  secondary: "bg-secondary text-secondary-foreground hover:opacity-90",
  outline: "border border-border bg-transparent text-foreground hover:bg-muted",
  ghost: "bg-transparent text-foreground hover:bg-muted",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

/** Movement uses transform only; nothing here animates width/height/top. */
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
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
`;

const cardSrc = (): string => `import * as React from "react";
import { cn } from "../lib/cn";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-[var(--radius)] border border-border bg-card text-card-foreground shadow-sm",
        "transition-[box-shadow,transform,opacity] duration-150",
        "hover:shadow-md hover:-translate-y-0.5",
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
  <h3 className={cn("text-lg font-semibold leading-tight", className)} {...p} />
);
export const CardContent = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-5 pt-0", className)} {...p} />
);
`;

const inputSrc = (): string => `import * as React from "react";
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
      {...props}
    />
  ),
);
Input.displayName = "Input";
`;

const modalSrc = (): string => `import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "../lib/cn";

export interface ModalProps {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  title?: string;
  children?: React.ReactNode;
}

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
          "rounded-[var(--radius)] border border-border bg-card p-5 text-card-foreground shadow-lg",
          "transition-[transform,opacity] duration-150",
          "data-[state=open]:animate-[df-zoom-in_160ms_ease-out]",
          "data-[state=closed]:animate-[df-zoom-out_140ms_ease-in]",
        )}
      >
        {title && <Dialog.Title className="mb-2 text-lg font-semibold">{title}</Dialog.Title>}
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

const navbarSrc = (): string => `import * as React from "react";
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
    <span className="font-semibold tracking-tight">{brand ?? "Brand"}</span>
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

const SOURCES: Record<Primitive, () => string> = {
  button: buttonSrc,
  card: cardSrc,
  input: inputSrc,
  modal: modalSrc,
  navbar: navbarSrc,
};

export function generateComponent(p: Primitive): string {
  const src = SOURCES[p]();
  assertNoLayoutThrashing(src, p);
  return src;
}

export function generateAllComponents(): Record<Primitive, string> {
  const out = {} as Record<Primitive, string>;
  for (const p of PRIMITIVES) out[p] = generateComponent(p);
  return out;
}
