import * as React from "react";
import { cn } from "@/lib/utils";

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "mb-2 block text-sm font-semibold text-brand-navy",
        className,
      )}
      {...props}
    />
  );
}

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-12 w-full rounded-xl border border-brand-navy/25 bg-brand-white px-4 text-sm text-brand-navy outline-none transition placeholder:text-brand-navy/45 focus:border-brand-orange focus:ring-3 focus:ring-brand-orange/15",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Checkbox = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    type="checkbox"
    className={cn(
      "size-4 shrink-0 accent-brand-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40",
      className,
    )}
    {...props}
  />
));
Checkbox.displayName = "Checkbox";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "h-12 w-full rounded-xl border border-brand-navy/25 bg-brand-white px-4 text-sm text-brand-navy outline-none transition focus:border-brand-orange focus:ring-3 focus:ring-brand-orange/15",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-28 w-full resize-y rounded-xl border border-brand-navy/25 bg-brand-white px-4 py-3 text-sm text-brand-navy outline-none transition placeholder:text-brand-navy/45 focus:border-brand-orange focus:ring-3 focus:ring-brand-orange/15",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export function FieldError({ id, message }: { id?: string; message?: string }) {
  return message ? (
    <p
      id={id}
      className="mt-1.5 border-l-2 border-red-500 pl-2 text-xs text-red-500"
    >
      {message}
    </p>
  ) : null;
}
