"use client";

import type { ReactNode } from "react";
import {
  get,
  useFormContext,
  type FieldValues,
  type UseFormReturn,
} from "react-hook-form";

import { cn } from "@/lib/utils";
import { Input } from "./form-controls";
import { FormField } from "./form-field";
import { FormInput, type FormInputProps } from "./form-fields";

export type MoneyFieldProps = Omit<
  FormInputProps,
  | "inputMode"
  | "leadingContent"
  | "min"
  | "registrationOptions"
  | "step"
  | "type"
> & {
  currencyLabel?: ReactNode;
  name: string;
};

const moneyFormatter = new Intl.NumberFormat("en-NA", {
  maximumFractionDigits: 2,
  useGrouping: true,
});

export function formatMoneyValue(value: unknown) {
  const numericValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numericValue)
    ? moneyFormatter.format(numericValue)
    : "";
}

function parseMoneyValue(value: string) {
  const normalized = value.replaceAll(",", "").replace(/[^\d.]/g, "");
  const [whole = "", ...fractionParts] = normalized.split(".");
  const fraction = fractionParts.join("").slice(0, 2);
  const normalizedNumber = fractionParts.length
    ? `${whole}.${fraction}`
    : whole;
  const numericValue = Number(normalizedNumber);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function formatMoneyText(value: string) {
  const normalized = value.replaceAll(",", "").replace(/[^\d.]/g, "");
  const [whole = "", ...fractionParts] = normalized.split(".");
  const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (fractionParts.length === 0) return groupedWhole;
  return `${groupedWhole}.${fractionParts.join("").slice(0, 2)}`;
}

function CurrencyPrefix({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm font-semibold text-brand-navy/60"
    >
      {children}
    </span>
  );
}

function moneyErrorMessage(error: unknown, contextError: unknown) {
  if (typeof error === "string") return error;
  if (
    contextError
    && typeof contextError === "object"
    && "message" in contextError
    && typeof contextError.message === "string"
  ) {
    return contextError.message;
  }
  return undefined;
}

function ControlledMoneyField({
  containerClassName,
  currencyLabel,
  error,
  id,
  label,
  labelAccessory,
  labelClassName,
  name,
  required,
  ...props
}: MoneyFieldProps & { currencyLabel: ReactNode }) {
  const controlId = id ?? name;
  const form = useFormContext<FieldValues>();
  const registration = form.register(name, {
    setValueAs: (value) => parseMoneyValue(String(value)),
  });
  const fieldError = get(form.formState.errors, name) as unknown;
  const message = moneyErrorMessage(error, fieldError);
  const errorId = message ? `${controlId}-error` : undefined;
  return (
    <FormField
      className={containerClassName}
      error={message}
      errorId={errorId}
      htmlFor={controlId}
      label={label}
      labelAccessory={labelAccessory}
      labelClassName={labelClassName}
      required={required}
    >
      <div className="relative">
        <CurrencyPrefix>{currencyLabel}</CurrencyPrefix>
        <Input
          {...props}
          aria-describedby={errorId ?? props["aria-describedby"]}
          aria-invalid={message ? true : props["aria-invalid"]}
          className={cn("pl-12", props.className)}
          defaultValue={formatMoneyValue(form.getValues(name))}
          id={controlId}
          inputMode="decimal"
          required={required}
          {...registration}
          onChange={(event) => {
            event.target.value = formatMoneyText(event.target.value);
            void registration.onChange(event);
            props.onChange?.(event);
          }}
          onBlur={(event) => {
            void registration.onBlur(event);
            props.onBlur?.(event);
          }}
          type="text"
        />
      </div>
    </FormField>
  );
}

export function MoneyField({
  currencyLabel = "N$",
  ...props
}: MoneyFieldProps) {
  const context = useFormContext() as UseFormReturn<FieldValues> | null;
  if (context) {
    return <ControlledMoneyField currencyLabel={currencyLabel} {...props} />;
  }
  return (
    <FormInput
      {...props}
      inputMode="decimal"
      leadingContent={<CurrencyPrefix>{currencyLabel}</CurrencyPrefix>}
      type="text"
    />
  );
}
