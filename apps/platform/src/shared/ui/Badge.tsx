import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-1.5",
    "whitespace-nowrap rounded-full font-bold",
    "[&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary: "bg-brand-orange text-brand-white",
        navy: "bg-brand-navy text-brand-white",
        gold: "bg-brand-gold text-brand-navy",
        red: "bg-red-600 text-brand-white",
        outline:
          "border border-brand-navy/20 bg-brand-white text-brand-navy",
        yellow: "bg-brand-yellow text-brand-navy",
        outlineWhite:
          "border border-brand-white bg-transparent text-brand-white",
        outlineOrange:
          "border border-brand-orange bg-transparent text-brand-orange",
        ghost: "bg-transparent text-brand-navy",
        subtle: "bg-brand-orange/10 text-brand-orange",
        success: "bg-brand-green text-brand-white",
        danger: "bg-red-600 text-white",
        inverse:
          "border border-brand-white/40 bg-transparent text-brand-white",
      },
      size: {
        sm: "px-2 py-0.5 text-[11px]",
        default: "px-3 py-1 text-xs",
        lg: "px-4 py-1.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, size, variant, ...props }: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ size, variant }), className)}
      {...props}
    />
  );
}
