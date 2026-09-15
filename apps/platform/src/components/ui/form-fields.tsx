import * as React from "react";

import { cn } from "@/lib/utils";
import { Input, Select, Textarea } from "./form-controls";
import { type FormBindingProps, useFormBinding } from "./form-binding";
import { FormField } from "./form-field";

type FieldOptions = {
  containerClassName?: string;
  label: React.ReactNode;
  labelAccessory?: React.ReactNode;
  labelClassName?: string;
} & FormBindingProps;

function useFieldIds(
  id: string | undefined,
  name: string | undefined,
  error?: string,
) {
  const generatedId = React.useId();
  const controlId = id ?? name ?? generatedId;
  return { controlId, errorId: error ? `${controlId}-error` : undefined };
}

export type FormInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "name"
> &
  FieldOptions & {
    leadingContent?: React.ReactNode;
  };

export function FormInput({
  containerClassName,
  error,
  id,
  label,
  labelAccessory,
  labelClassName,
  leadingContent,
  name,
  registrationOptions,
  ...props
}: FormInputProps) {
  const binding = useFormBinding({ error, name, registrationOptions });
  const ids = useFieldIds(id, binding.name, binding.error);
  const describedBy = ids.errorId ?? props["aria-describedby"];
  return (
    <FormField
      className={containerClassName}
      error={binding.error}
      errorId={ids.errorId}
      htmlFor={ids.controlId}
      label={label}
      labelAccessory={labelAccessory}
      labelClassName={labelClassName}
      required={props.required}
    >
      <div className="relative">
        {leadingContent}
        <Input
          {...binding.registration}
          {...props}
          id={ids.controlId}
          name={binding.name}
          className={cn(leadingContent && "pl-12", props.className)}
          aria-describedby={describedBy}
          aria-invalid={binding.error ? true : props["aria-invalid"]}
        />
      </div>
    </FormField>
  );
}

export type FormSelectItem = {
  disabled?: boolean;
  label: string;
  value: string | number;
};
export type FormSelectProps = Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "children" | "name"
> &
  FieldOptions & {
    items: readonly FormSelectItem[];
    placeholder?: string;
  };

export function FormSelect({
  containerClassName,
  error,
  id,
  items,
  label,
  labelAccessory,
  labelClassName,
  name,
  placeholder,
  registrationOptions,
  ...props
}: FormSelectProps) {
  const binding = useFormBinding({ error, name, registrationOptions });
  const ids = useFieldIds(id, binding.name, binding.error);
  const describedBy = ids.errorId ?? props["aria-describedby"];
  return (
    <FormField
      className={containerClassName}
      error={binding.error}
      errorId={ids.errorId}
      htmlFor={ids.controlId}
      label={label}
      labelAccessory={labelAccessory}
      labelClassName={labelClassName}
      required={props.required}
    >
      <Select
        {...binding.registration}
        {...props}
        id={ids.controlId}
        name={binding.name}
        aria-describedby={describedBy}
        aria-invalid={binding.error ? true : props["aria-invalid"]}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {items.map((item) => (
          <option key={item.value} value={item.value} disabled={item.disabled}>
            {item.label}
          </option>
        ))}
      </Select>
    </FormField>
  );
}

export type FormTextareaProps = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  "name"
> &
  FieldOptions;

export function FormTextarea({
  containerClassName,
  error,
  id,
  label,
  labelAccessory,
  labelClassName,
  name,
  registrationOptions,
  ...props
}: FormTextareaProps) {
  const binding = useFormBinding({ error, name, registrationOptions });
  const ids = useFieldIds(id, binding.name, binding.error);
  const describedBy = ids.errorId ?? props["aria-describedby"];
  return (
    <FormField
      className={containerClassName}
      error={binding.error}
      errorId={ids.errorId}
      htmlFor={ids.controlId}
      label={label}
      labelAccessory={labelAccessory}
      labelClassName={labelClassName}
      required={props.required}
    >
      <Textarea
        {...binding.registration}
        {...props}
        id={ids.controlId}
        name={binding.name}
        aria-describedby={describedBy}
        aria-invalid={binding.error ? true : props["aria-invalid"]}
      />
    </FormField>
  );
}
