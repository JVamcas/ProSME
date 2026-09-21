import * as React from "react";

import { cn } from "@/lib/utils";
import { FormMultiSelect } from "@/shared/ui/FormMultiSelect";
import { Input, Select, Textarea } from "./form-controls";
import { type FormBindingProps, useFormBinding } from "./form-binding";
import { FormField } from "./form-field";
import type { InfoTooltipSide } from "@/shared/ui/InfoTooltip";

type FieldOptions = {
  containerClassName?: string;
  infoTooltip?: React.ReactNode;
  infoTooltipSide?: InfoTooltipSide;
  label: React.ReactNode;
  labelAccessory?: React.ReactNode;
  labelClassName?: string;
} & FormBindingProps;

export type FormControlSize = "compact" | "default";

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
  "name" | "size"
> &
  FieldOptions & {
    leadingContent?: React.ReactNode;
    size?: FormControlSize;
  };

export function FormInput({
  containerClassName,
  error,
  id,
  infoTooltip,
  infoTooltipSide,
  label,
  labelAccessory,
  labelClassName,
  leadingContent,
  name,
  registrationOptions,
  size = "default",
  ...props
}: FormInputProps) {
  const binding = useFormBinding({ error, name, registrationOptions });
  const ids = useFieldIds(id, binding.name, binding.error);
  const describedBy = [ids.errorId, props["aria-describedby"]]
    .filter(Boolean)
    .join(" ") || undefined;
  return (
    <FormField
      className={containerClassName}
      error={binding.error}
      errorId={ids.errorId}
      htmlFor={ids.controlId}
      infoTooltip={infoTooltip}
      infoTooltipSide={infoTooltipSide}
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
          className={cn(
            size === "compact" && "h-8 rounded-lg px-3 text-xs",
            leadingContent && "pl-12",
            props.className,
          )}
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
  "children" | "name" | "size"
> &
  FieldOptions & {
    items: readonly FormSelectItem[];
    onMultipleBlur?: (values: string[]) => void;
    onMultipleChange?: (values: string[]) => void;
    onMultipleFocus?: (values: string[]) => void;
    placeholder?: string;
    size?: FormControlSize;
  };

export function FormSelect({
  containerClassName,
  error,
  id,
  infoTooltip,
  infoTooltipSide,
  items,
  label,
  labelAccessory,
  labelClassName,
  name,
  onMultipleBlur,
  onMultipleChange,
  onMultipleFocus,
  placeholder,
  registrationOptions,
  size = "default",
  ...props
}: FormSelectProps) {
  const binding = useFormBinding({ error, name, registrationOptions });
  const ids = useFieldIds(id, binding.name, binding.error);
  const describedBy = [ids.errorId, props["aria-describedby"]]
    .filter(Boolean)
    .join(" ") || undefined;

  if (props.multiple) {
    return (
      <FormField
        className={containerClassName}
        error={binding.error}
        errorId={ids.errorId}
        htmlFor={ids.controlId}
        infoTooltip={infoTooltip}
        infoTooltipSide={infoTooltipSide}
        label={label}
        labelAccessory={labelAccessory}
        labelClassName={labelClassName}
        required={props.required}
      >
        <FormMultiSelect
          className={cn(
            size === "compact" && "h-8 rounded-lg px-3 text-xs",
            props.className,
          )}
          defaultValue={Array.isArray(props.defaultValue) ? props.defaultValue : []}
          describedBy={describedBy}
          disabled={props.disabled}
          id={ids.controlId}
          invalid={Boolean(binding.error ?? props["aria-invalid"])}
          items={items}
          name={binding.name}
          onBlur={onMultipleBlur}
          onChange={onMultipleChange}
          onFocus={onMultipleFocus}
          placeholder={placeholder}
          registration={binding.registration}
          value={Array.isArray(props.value) ? props.value : undefined}
        />
      </FormField>
    );
  }

  return (
    <FormField
      className={containerClassName}
      error={binding.error}
      errorId={ids.errorId}
      htmlFor={ids.controlId}
      infoTooltip={infoTooltip}
      infoTooltipSide={infoTooltipSide}
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
        className={cn(
          size === "compact" && "h-8 rounded-lg px-3 text-xs",
          props.className,
        )}
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
  infoTooltip,
  infoTooltipSide,
  label,
  labelAccessory,
  labelClassName,
  name,
  registrationOptions,
  ...props
}: FormTextareaProps) {
  const binding = useFormBinding({ error, name, registrationOptions });
  const ids = useFieldIds(id, binding.name, binding.error);
  const describedBy = [ids.errorId, props["aria-describedby"]]
    .filter(Boolean)
    .join(" ") || undefined;
  return (
    <FormField
      className={containerClassName}
      error={binding.error}
      errorId={ids.errorId}
      htmlFor={ids.controlId}
      infoTooltip={infoTooltip}
      infoTooltipSide={infoTooltipSide}
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
