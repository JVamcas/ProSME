import * as React from "react";

import { cn } from "@/lib/utils";
import {
  type FormBindingProps,
  useFormBinding,
} from "./form-binding";
import { Checkbox, FieldError, Input, Label } from "./form-controls";

type FieldLayoutProps = {
  children: React.ReactNode;
  className?: string;
  error?: string;
  errorId?: string;
  htmlFor?: string;
  label: React.ReactNode;
  labelAccessory?: React.ReactNode;
  labelClassName?: string;
};

export function FormField({
  children,
  className,
  error,
  errorId,
  htmlFor,
  label,
  labelAccessory,
  labelClassName,
}: FieldLayoutProps) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between">
        <Label className={labelClassName} htmlFor={htmlFor}>
          {label}
        </Label>
        {labelAccessory}
      </div>
      {children}
      <FieldError id={errorId} message={error} />
    </div>
  );
}

export type CheckboxFieldProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "name" | "type"
> & {
  containerClassName?: string;
  controlClassName?: string;
  label: React.ReactNode;
} & FormBindingProps;

export function CheckboxField({
  className,
  containerClassName,
  controlClassName,
  error,
  id,
  label,
  name,
  registrationOptions,
  ...props
}: CheckboxFieldProps) {
  const binding = useFormBinding({ error, name, registrationOptions });
  const generatedId = React.useId();
  const controlId = id ?? binding.name ?? generatedId;
  const errorId = binding.error ? `${controlId}-error` : undefined;

  return (
    <div>
      <label
        className={cn(
          "flex cursor-pointer items-start gap-3",
          containerClassName,
        )}
      >
        <Checkbox
          {...binding.registration}
          {...props}
          id={controlId}
          name={binding.name}
          className={cn("mt-1", className, controlClassName)}
          aria-describedby={errorId ?? props["aria-describedby"]}
          aria-invalid={binding.error ? true : props["aria-invalid"]}
        />
        <span>{label}</span>
      </label>
      <FieldError id={errorId} message={binding.error} />
    </div>
  );
}

export function HoneypotField({ name = "company" }: { name?: string }) {
  const binding = useFormBinding({ name });

  return (
    <label className="hidden" aria-hidden="true">
      Company
      <Input
        {...binding.registration}
        name={binding.name}
        tabIndex={-1}
        autoComplete="off"
      />
    </label>
  );
}
