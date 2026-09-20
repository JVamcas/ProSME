import * as React from "react";

import { cn } from "@/lib/utils";
import {
  InfoTooltip,
  type InfoTooltipSide,
} from "@/shared/ui/InfoTooltip";
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
  infoTooltip?: React.ReactNode;
  infoTooltipSide?: InfoTooltipSide;
  label: React.ReactNode;
  labelAccessory?: React.ReactNode;
  labelClassName?: string;
  required?: boolean;
};

export function FormField({
  children,
  className,
  error,
  errorId,
  htmlFor,
  infoTooltip,
  infoTooltipSide,
  label,
  labelAccessory,
  labelClassName,
  required = false,
}: FieldLayoutProps) {
  const labelNode = (
    <Label className={labelClassName} htmlFor={htmlFor}>
      {label}
      {required ? (
        <>
          <span aria-hidden="true" className="ml-1 text-brand-orange">
            *
          </span>
          <span className="sr-only">(required)</span>
        </>
      ) : null}
    </Label>
  );

  return (
    <div className={className}>
      <div className="flex items-center justify-between">
        {infoTooltip ? (
          <InfoTooltip content={infoTooltip} side={infoTooltipSide}>
            {labelNode}
          </InfoTooltip>
        ) : labelNode}
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
  description?: React.ReactNode;
  label: React.ReactNode;
} & FormBindingProps;

export function CheckboxField({
  className,
  containerClassName,
  controlClassName,
  description,
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
  const descriptionId = description ? `${controlId}-description` : undefined;
  const errorId = binding.error ? `${controlId}-error` : undefined;
  const describedBy = [descriptionId, errorId, props["aria-describedby"]]
    .filter(Boolean)
    .join(" ") || undefined;

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
          aria-describedby={describedBy}
          aria-invalid={binding.error ? true : props["aria-invalid"]}
        />
        <span>{label}</span>
      </label>
      {description ? (
        <p
          className="ml-7 mt-1 text-xs font-normal leading-relaxed text-brand-navy/60"
          id={descriptionId}
        >
          {description}
        </p>
      ) : null}
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
