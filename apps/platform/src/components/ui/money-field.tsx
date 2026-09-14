import type { ReactNode } from "react";
import type { FieldValues, RegisterOptions } from "react-hook-form";

import { FormInput, type FormInputProps } from "./form-fields";

type MoneyRegistrationOptions = Omit<
  RegisterOptions<FieldValues>,
  "pattern" | "setValueAs" | "valueAsDate" | "valueAsNumber"
>;

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
  registrationOptions?: MoneyRegistrationOptions;
};

export function MoneyField({
  currencyLabel = "N$",
  registrationOptions,
  ...props
}: MoneyFieldProps) {
  return (
    <FormInput
      {...props}
      inputMode="decimal"
      leadingContent={
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm font-semibold text-brand-navy/60"
        >
          {currencyLabel}
        </span>
      }
      min="0"
      registrationOptions={{
        ...registrationOptions,
        valueAsNumber: true,
      }}
      step="0.01"
      type="number"
    />
  );
}
