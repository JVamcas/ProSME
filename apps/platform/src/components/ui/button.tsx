import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition-all [&_svg]:text-brand-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-brand-orange text-brand-navy shadow-sm hover:bg-brand-yellow [&_svg]:text-brand-navy",
        gold: "bg-brand-gold text-brand-navy shadow-sm hover:bg-brand-yellow [&_svg]:text-brand-navy",
        outline:
          "border border-brand-navy/35 bg-brand-white text-brand-navy hover:border-brand-navy hover:bg-brand-cream",
        ghost: "text-brand-navy hover:bg-brand-cream",
        danger: "bg-red-600 text-white hover:bg-red-700 [&_svg]:text-white",
        brand:
          "bg-brand-orange text-brand-navy shadow-sm hover:bg-brand-yellow [&_svg]:text-brand-navy",
        navy: "bg-brand-navy text-brand-white shadow-sm hover:bg-brand-orange hover:text-brand-navy",
        inverse:
          "border border-brand-white/50 text-brand-white hover:bg-brand-white/10",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-4 text-xs",
        lg: "h-13 px-7 text-base",
        icon: "size-10 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export interface IconButtonProps extends Omit<
  ButtonProps,
  "aria-label" | "size"
> {
  label: string;
}

export function IconButton({ label, ...props }: IconButtonProps) {
  return <Button aria-label={label} size="icon" {...props} />;
}
