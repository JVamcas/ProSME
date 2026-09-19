"use client";

import { useFormContext } from "react-hook-form";

import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/form-controls";
import { FormInput, FormSelect, FormTextarea } from "@/components/ui/form-fields";
import type { FormField as RuntimeField } from "@/modules/forms/FormTypes";

type RuntimeValues = Record<string, unknown>;

function fieldError(errors: Record<string, unknown>, key: string) {
  const error = errors[key] as { message?: unknown } | undefined;
  return typeof error?.message === "string" ? error.message : undefined;
}

function YesNoControl({
  error,
  field,
  readOnly,
}: {
  error?: string;
  field: RuntimeField;
  readOnly: boolean;
}) {
  const { register } = useFormContext<RuntimeValues>();
  const errorId = error ? `${field.key}-error` : undefined;
  const helpId = `${field.key}-help`;
  return (
    <FormField
      error={error}
      errorId={errorId}
      label={field.label}
      required={field.required}
    >
      <div
        aria-describedby={[errorId, helpId].filter(Boolean).join(" ") || undefined}
        aria-invalid={error ? true : undefined}
        className="mt-2 flex gap-5"
        role="radiogroup"
      >
        {[{ label: "Yes", value: "true" }, { label: "No", value: "false" }]
          .map((option) => (
            <label className="flex items-center gap-2" key={option.value}>
              <Input
                {...register(field.key, {
                  setValueAs: (value) => value === "true",
                })}
                className="size-4"
                disabled={readOnly}
                type="radio"
                value={option.value}
              />
              <span>{option.label}</span>
            </label>
          ))}
      </div>
    </FormField>
  );
}

function StandardControl({
  error,
  field,
  readOnly,
}: {
  error?: string;
  field: RuntimeField;
  readOnly: boolean;
}) {
  const shared = {
    "aria-describedby": `${field.key}-help`,
    disabled: readOnly,
    error,
    label: field.label,
    name: field.key,
    required: field.required,
  };
  if (field.type === "TEXTAREA") return <FormTextarea {...shared} />;
  if (field.type === "SELECT") {
    return (
      <FormSelect
        {...shared}
        items={(field.options ?? []).map((option) => ({
          label: option.label,
          value: option.key,
        }))}
        placeholder="Select…"
      />
    );
  }
  const type = field.type === "DATE"
    ? "date"
    : field.type === "NUMBER"
      ? "number"
      : "text";
  return <FormInput {...shared} type={type} />;
}

export function DynamicFormField({
  field,
  readOnly,
}: {
  field: RuntimeField;
  readOnly: boolean;
}) {
  const { formState } = useFormContext<RuntimeValues>();
  const error = fieldError(
    formState.errors as Record<string, unknown>,
    field.key,
  );
  return (
    <div>
      {field.type === "YES_NO" ? (
        <YesNoControl error={error} field={field} readOnly={readOnly} />
      ) : (
        <StandardControl error={error} field={field} readOnly={readOnly} />
      )}
      {field.helpText ? (
        <p className="mt-1 text-xs text-brand-navy/60" id={`${field.key}-help`}>
          {field.helpText}
        </p>
      ) : null}
    </div>
  );
}
