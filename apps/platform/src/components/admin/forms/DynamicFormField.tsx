"use client";

import { CheckboxField, FormField } from "@/components/ui/form-field";
import { FormInput, FormSelect, FormTextarea } from "@/components/ui/form-fields";
import { Input } from "@/components/ui/form-controls";
import type { FormField as RuntimeField } from "@/modules/forms/FormTypes";
import { useFormContext } from "react-hook-form";

type RuntimeValues = Record<string, unknown>;

type DynamicFormFieldProps = {
  field: RuntimeField;
  readOnly: boolean;
};

function fieldError(
  errors: Record<string, unknown>,
  code: string,
) {
  const error = errors[code] as { message?: unknown } | undefined;
  return typeof error?.message === "string" ? error.message : undefined;
}

function fieldLabel(field: RuntimeField) {
  return field.label;
}

function numberInput(field: RuntimeField) {
  return field.inputType === "MONEY" || field.inputType === "NUMBER";
}

function inputType(field: RuntimeField) {
  if (field.inputType === "DATE") return "date";
  if (numberInput(field)) return "number";
  return "text";
}

function textControl(
  field: RuntimeField,
  readOnly: boolean,
  error: string | undefined,
) {
  const helpId = `${field.code}-help`;
  if (field.inputType === "TEXTAREA") {
    return (
      <FormTextarea
        disabled={readOnly}
        error={error}
        label={fieldLabel(field)}
        name={field.code}
        placeholder={field.placeholder ?? undefined}
        required={field.required}
        aria-describedby={helpId}
      />
    );
  }
  if (field.inputType === "SELECT") {
    return (
      <FormSelect
        disabled={readOnly}
        error={error}
        items={(field.options ?? []).map((option) => ({
          label: option.label,
          value: option.code,
        }))}
        label={fieldLabel(field)}
        name={field.code}
        placeholder="Select…"
        required={field.required}
        aria-describedby={helpId}
      />
    );
  }
  return (
    <FormInput
      disabled={readOnly}
      error={error}
      label={fieldLabel(field)}
      name={field.code}
      placeholder={field.placeholder ?? undefined}
      required={field.required}
      aria-describedby={helpId}
      type={inputType(field)}
    />
  );
}

function RadioControl(
  field: RuntimeField,
  readOnly: boolean,
  error: string | undefined,
) {
  const { register } = useFormContext<RuntimeValues>();
  const errorId = error ? `${field.code}-error` : undefined;
  const helpId = `${field.code}-help`;
  return (
    <FormField
      error={error}
      errorId={errorId}
      label={fieldLabel(field)}
      required={field.required}
    >
      <div
        aria-describedby={[errorId, helpId].filter(Boolean).join(" ") || undefined}
        aria-invalid={error ? true : undefined}
        className="mt-2 space-y-2"
        role="radiogroup"
      >
        {(field.options ?? []).map((option) => (
          <label className="flex items-center gap-2" key={option.code}>
            <Input
              {...register(field.code)}
              aria-label={option.label}
              className="size-4"
              disabled={readOnly}
              type="radio"
              value={option.code}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </FormField>
  );
}

function checkboxControl(
  field: RuntimeField,
  readOnly: boolean,
  error: string | undefined,
) {
  return (
    <CheckboxField
      disabled={readOnly}
      error={error}
      label={(
        <span>
          {field.label}
          {field.required ? (
            <span aria-hidden="true" className="ml-1 text-brand-orange">
              *
            </span>
          ) : null}
        </span>
      )}
      name={field.code}
      aria-describedby={`${field.code}-help`}
    />
  );
}

export function DynamicFormField({ field, readOnly }: DynamicFormFieldProps) {
  const { formState } = useFormContext<RuntimeValues>();
  const error = fieldError(formState.errors as Record<string, unknown>, field.code);
  const spanClass = field.columnSpan === 2 ? "md:col-span-2" : "";
  const columnClass = field.columnIndex === 2 ? "md:col-start-2" : "";
  return (
    <div className={`${spanClass} ${columnClass}`.trim()}>
      {field.inputType === "RADIO"
        ? RadioControl(field, readOnly, error)
        : field.inputType === "CHECKBOX"
          ? checkboxControl(field, readOnly, error)
          : textControl(field, readOnly, error)}
      {field.helpText ? (
        <p className="mt-1 text-xs text-brand-navy/60" id={`${field.code}-help`}>
          {field.helpText}
        </p>
      ) : null}
    </div>
  );
}
