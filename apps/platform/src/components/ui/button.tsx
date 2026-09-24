import * as React from "react";
import Link, { type LinkProps } from "next/link";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2",
    "rounded-full font-semibold",
    "transition-colors duration-150",
    "focus-visible:outline-none",
    "focus-visible:ring-2",
    "focus-visible:ring-brand-navy",
    "focus-visible:ring-offset-2",
    "disabled:pointer-events-none",
    "disabled:opacity-50",
    "[&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary: [
          "bg-brand-orange text-brand-white",
          "shadow-sm",
          "hover:bg-brand-yellow hover:text-brand-navy",
          "[&_svg]:text-current",
        ],

        navy: [
          "bg-brand-navy text-brand-white",
          "shadow-sm",
          "hover:bg-brand-orange",
          "[&_svg]:text-current",
        ],

        gold: [
          "bg-brand-gold text-brand-navy",
          "shadow-sm",
          "hover:bg-brand-yellow",
          "[&_svg]:text-current",
        ],

        outline: [
          "border border-brand-navy/20",
          "bg-brand-white text-brand-navy",
          "hover:border-brand-orange/40",
          "hover:bg-brand-cream",
          "[&_svg]:text-brand-orange",
        ],
        yellow: [
          "bg-brand-yellow text-brand-navy",
          "shadow-sm",
          "hover:bg-brand-gold",
          "[&_svg]:text-current",
        ],
        outlineWhite: [
          "border border-brand-white",
          "bg-transparent text-brand-white",
          "hover:bg-brand-white/10",
          "[&_svg]:text-current",
        ],

        outlineOrange: [
          "border border-brand-orange",
          "bg-transparent text-brand-orange",
          "hover:bg-brand-orange/10",
          "[&_svg]:text-current",
        ],

        ghost: [
          "bg-transparent text-brand-navy",
          "hover:bg-brand-cream",
          "[&_svg]:text-brand-orange",
        ],

        subtle: [
          "bg-brand-orange/10 text-brand-orange",
          "hover:bg-brand-orange/15",
          "[&_svg]:text-current",
        ],

        success: [
          "bg-brand-green text-brand-white",
          "shadow-sm",
          "hover:bg-brand-green/90",
          "[&_svg]:text-current",
        ],

        danger: [
          "bg-red-600 text-white",
          "shadow-sm",
          "hover:bg-red-700",
          "[&_svg]:text-current",
        ],

        inverse: [
          "border border-brand-white/40",
          "bg-transparent text-brand-white",
          "hover:bg-brand-white/10",
          "[&_svg]:text-current",
        ],
      },

      size: {
        default: "h-10 px-5 text-sm",
        sm: "h-9 px-4 text-xs",
        compact: "h-8 gap-1.5 px-3 text-xs",
        lg: "h-12 px-7 text-base",
        icon: "size-10 p-0",
        "icon-compact": "size-8 p-0",
      },
    },

    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function GeneralButton({
  className,
  variant,
  size,
  asChild = false,
  type,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      type={asChild ? undefined : (type ?? "button")}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export interface GeneralButtonLinkProps
  extends
    LinkProps,
    Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">,
    VariantProps<typeof buttonVariants> {}

export function GeneralButtonLink({
  className,
  variant,
  size,
  ...props
}: GeneralButtonLinkProps) {
  return (
    <Link
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export interface IconButtonProps extends Omit<
  ButtonProps,
  "aria-label" | "children" | "size"
> {
  label: string;
  compact?: boolean;
  children: React.ReactNode;
}

export function IconButton({
  label,
  compact = false,
  children,
  ...props
}: IconButtonProps) {
  return (
    <GeneralButton
      aria-label={label}
      size={compact ? "icon-compact" : "icon"}
      {...props}
    >
      {children}
    </GeneralButton>
  );
}
