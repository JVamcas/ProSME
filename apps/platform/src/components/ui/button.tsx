import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-orange-dark text-white shadow-sm hover:bg-navy-light",
        gold: "bg-orange-dark text-white shadow-sm hover:bg-navy-light",
        outline:
          "border border-orange/45 bg-white text-orange-dark hover:border-orange hover:bg-orange-pale",
        ghost: "text-navy hover:bg-slate-100",
        danger: "bg-red-600 text-white hover:bg-red-700",
        brand: "bg-brand-orange text-brand-white shadow-sm hover:bg-brand-navy",
        navy: "bg-brand-navy text-brand-white shadow-sm hover:bg-brand-orange",
        inverse: "border border-white/50 text-white hover:bg-white/10",
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
  return (
    <Button
      aria-label={label}
      size="icon"
      {...props}
    />
  );
}
