import { Check } from "lucide-react";
import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type FormRadioCardProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  description?: string;
  label: string;
};

export function FormRadioCard({
  checked,
  className,
  description,
  label,
  ...props
}: FormRadioCardProps) {
  return (
    <label
      className={cn(
        "flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border bg-brand-white px-4 py-3 text-sm font-semibold text-brand-navy transition",
        "hover:border-brand-orange focus-within:ring-2 focus-within:ring-brand-orange/30",
        checked ? "border-brand-orange bg-brand-cream" : "border-brand-navy/20",
        className,
      )}
    >
      <input
        {...props}
        checked={checked}
        className="sr-only"
        type="radio"
      />
      <span
        aria-hidden="true"
        className={cn(
          "grid size-5 place-items-center rounded-full border",
          checked
            ? "border-brand-orange bg-brand-orange"
            : "border-brand-navy/30",
        )}
      >
        {checked ? <Check className="size-3.5 text-brand-navy" /> : null}
      </span>
      <span>
        <span className="block">{label}</span>
        {description ? (
          <span className="mt-1 block text-xs font-normal leading-5 text-brand-navy/60">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}
