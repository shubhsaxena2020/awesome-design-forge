import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "../../../src/lib/cn.ts";

/** Live UI kit used by the preview showroom. Mirrors the class contract emitted
 *  by src/generators/component-factory.ts (same Tailwind utilities, same vars). */

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
          "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 hover:-translate-y-px",
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

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-[var(--radius)] border border-border bg-card text-card-foreground shadow-sm",
        "transition-[box-shadow,transform,opacity] duration-150 hover:shadow-md hover:-translate-y-0.5",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

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

export const Navbar = ({ className, brand, children, ...props }: React.HTMLAttributes<HTMLElement> & { brand?: string }) => (
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
      "transition-[color,background-color,opacity,transform] duration-150 hover:text-foreground hover:bg-muted hover:-translate-y-px",
      className,
    )}
    {...p}
  />
);
