"use client";

import type { ReactNode } from "react";
import { get, useFormContext, type FieldValues } from "react-hook-form";

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

function normalizeMoneyInput(value: string) {
  const sanitized = value.replace(/[^\d.]/g, "");
  const [whole = "", ...decimalParts] = sanitized.split(".");
  const decimal = decimalParts.join("").slice(0, 2);

  return {
    whole,
    decimal,
    hasDecimal: decimalParts.length > 0,
  };
}

export function formatMoneyValue(value: unknown) {
  if (value === "" || value === null || value === undefined) {
    return "";
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue)
    ? moneyFormatter.format(numericValue)
    : "";
}

export function formatNAD(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "Not provided";
  }

  return `N$ ${moneyFormatter.format(value)}`;
}

function formatMoneyInput(value: string) {
  const { whole, decimal, hasDecimal } = normalizeMoneyInput(value);

  const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return hasDecimal ? `${groupedWhole}.${decimal}` : groupedWhole;
}

function parseMoneyInput(value: string) {
  const { whole, decimal, hasDecimal } = normalizeMoneyInput(value);

  if (!whole && !decimal) {
    return undefined;
  }

  const numericValue = Number(
    hasDecimal ? `${whole || "0"}.${decimal}` : whole,
  );

  return Number.isFinite(numericValue) ? numericValue : undefined;
}

function getErrorMessage(error: unknown) {
  if (typeof error === "string") {
    return error;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return undefined;
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
  ...inputProps
}: MoneyFieldProps & { currencyLabel: ReactNode }) {
  const form = useFormContext<FieldValues>();
  const controlId = id ?? name;

  const registration = form.register(name, {
    setValueAs: (value) => parseMoneyInput(String(value)),
  });

  const fieldError = get(form.formState.errors, name);
  const errorMessage =
    getErrorMessage(error) ?? getErrorMessage(fieldError);

  const errorId = errorMessage ? `${controlId}-error` : undefined;

  const currentValue = form.getValues(name);
  const initialValue =
    Number(currentValue) === 0 ? "" : formatMoneyValue(currentValue);

  return (
    <FormField
      className={containerClassName}
      error={errorMessage}
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
          {...inputProps}
          {...registration}
          id={controlId}
          type="text"
          inputMode="decimal"
          required={required}
          defaultValue={initialValue}
          aria-describedby={errorId ?? inputProps["aria-describedby"]}
          aria-invalid={
            errorMessage ? true : inputProps["aria-invalid"]
          }
          className={cn("pl-12", inputProps.className)}
          onChange={(event) => {
            event.target.value = formatMoneyInput(event.target.value);

            void registration.onChange(event);
            inputProps.onChange?.(event);
          }}
          onBlur={(event) => {
            void registration.onBlur(event);
            inputProps.onBlur?.(event);
          }}
        />
      </div>
    </FormField>
  );
}

export function MoneyField({
  currencyLabel = "N$",
  ...props
}: MoneyFieldProps) {
  const form = useFormContext<FieldValues>();

  if (form) {
    return (
      <ControlledMoneyField
        {...props}
        currencyLabel={currencyLabel}
      />
    );
  }

  return (
    <FormInput
      {...props}
      type="text"
      inputMode="decimal"
      leadingContent={
        <CurrencyPrefix>{currencyLabel}</CurrencyPrefix>
      }
    />
  );
}