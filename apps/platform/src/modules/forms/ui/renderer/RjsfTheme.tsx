"use client";

import {
  enumOptionsIndexForValue,
  enumOptionsValueForIndex,
  getInputProps,
  type BaseInputTemplateProps,
  type FieldTemplateProps,
  type RJSFSchema,
  type WidgetProps,
} from "@rjsf/utils";
import type { ChangeEvent, FocusEvent } from "react";

import { FormDateInput } from "@/components/ui/form-date-input";
import {
  FormInput,
  FormSelect,
  FormTextarea,
} from "@/components/ui/form-fields";
import { FormRadioGroup } from "@/shared/ui/FormRadioGroup";

type Values = Record<string, unknown>;
type InputProps = BaseInputTemplateProps<Values, RJSFSchema>;
type FieldProps = FieldTemplateProps<Values, RJSFSchema>;
type FormWidgetProps = WidgetProps<Values, RJSFSchema>;

function errorMessage(errors?: string[]) {
  return errors?.filter(Boolean).join(" ") || undefined;
}

function HelpText({
  description,
  id,
}: {
  description?: string;
  id: string;
}) {
  if (!description) return null;
  return (
    <p className="mt-1 text-xs text-brand-navy/60" id={`${id}-help`}>
      {description}
    </p>
  );
}

export function FormFieldTemplate({ children, hidden }: FieldProps) {
  if (hidden) return <div className="hidden">{children}</div>;
  return children;
}

export function FormBaseInputTemplate(props: InputProps) {
  const inputProps = getInputProps(props.schema, props.type, props.options);
  const value = props.value === null || props.value === undefined
    ? ""
    : props.value;
  return (
    <div>
      <FormInput
        {...inputProps}
        aria-describedby={`${props.id}-help`}
        autoFocus={props.autofocus}
        disabled={props.disabled}
        error={errorMessage(props.rawErrors)}
        id={props.id}
        label={props.label}
        name={props.htmlName ?? props.id}
        onBlur={(event) => props.onBlur(props.id, event.target.value)}
        onChange={props.onChangeOverride ?? ((event) => {
          const next = event.target.value;
          props.onChange(next === "" ? props.options.emptyValue : next);
        })}
        onFocus={(event) => props.onFocus(props.id, event.target.value)}
        placeholder={props.placeholder}
        readOnly={props.readonly}
        required={props.required}
        value={value}
      />
      <HelpText description={props.schema.description} id={props.id} />
    </div>
  );
}

export function FormTextareaWidget(props: FormWidgetProps) {
  return (
    <div>
      <FormTextarea
        aria-describedby={`${props.id}-help`}
        autoFocus={props.autofocus}
        disabled={props.disabled}
        error={errorMessage(props.rawErrors)}
        id={props.id}
        label={props.label}
        name={props.htmlName ?? props.id}
        onBlur={(event) => props.onBlur(props.id, event.target.value)}
        onChange={(event) => {
          props.onChange(event.target.value || props.options.emptyValue);
        }}
        onFocus={(event) => props.onFocus(props.id, event.target.value)}
        placeholder={props.placeholder}
        readOnly={props.readonly}
        required={props.required}
        value={props.value ?? ""}
      />
      <HelpText description={props.schema.description} id={props.id} />
    </div>
  );
}

export function FormDateWidget(props: FormWidgetProps) {
  return (
    <FormDateInput
      description={props.schema.description}
      disabled={props.disabled}
      error={errorMessage(props.rawErrors)}
      label={props.label}
      name={props.htmlName ?? props.id}
      onBlurValue={(value) => props.onBlur(props.id, value)}
      onChangeValue={(value) => {
        props.onChange(value || props.options.emptyValue);
      }}
      onFocusValue={(value) => props.onFocus(props.id, value)}
      readOnly={props.readonly}
      required={props.required}
      value={props.value ?? ""}
    />
  );
}

function selectedValue(props: FormWidgetProps) {
  return enumOptionsIndexForValue(
    props.value,
    props.options.enumOptions,
    props.multiple,
  ) ?? (props.multiple ? [] : "");
}

function selectValue(
  props: FormWidgetProps,
  event: ChangeEvent<HTMLSelectElement> | FocusEvent<HTMLSelectElement>,
) {
  const value = props.multiple
    ? [...event.target.selectedOptions].map((option) => option.value)
    : event.target.value;
  return enumOptionsValueForIndex(
    value,
    props.options.enumOptions,
    props.options.emptyValue,
  );
}

export function FormSelectWidget(props: FormWidgetProps) {
  const items = (props.options.enumOptions ?? []).map((option, index) => ({
    disabled: props.options.enumDisabled?.includes(option.value),
    label: option.label,
    value: index,
  }));
  return (
    <div>
      <FormSelect
        aria-describedby={`${props.id}-help`}
        autoFocus={props.autofocus}
        disabled={props.disabled || props.readonly}
        error={errorMessage(props.rawErrors)}
        id={props.id}
        items={items}
        label={props.label}
        multiple={props.multiple}
        name={props.htmlName ?? props.id}
        onBlur={(event) => props.onBlur(props.id, selectValue(props, event))}
        onChange={(event) => props.onChange(selectValue(props, event))}
        onFocus={(event) => props.onFocus(props.id, selectValue(props, event))}
        placeholder={props.placeholder ?? "Select…"}
        required={props.required}
        value={selectedValue(props)}
      />
      <HelpText description={props.schema.description} id={props.id} />
    </div>
  );
}

export function FormRadioWidget(props: FormWidgetProps) {
  const options = (props.options.enumOptions ?? []).map((option) => ({
    disabled: props.options.enumDisabled?.includes(option.value),
    label: option.label,
    value: option.value,
  }));
  return (
    <FormRadioGroup
      disabled={props.disabled}
      error={errorMessage(props.rawErrors)}
      helpText={props.schema.description}
      id={props.id}
      label={props.label}
      name={props.htmlName ?? props.id}
      onBlur={(value) => props.onBlur(props.id, value)}
      onFocus={(value) => props.onFocus(props.id, value)}
      onValueChange={props.onChange}
      options={options}
      readOnly={props.readonly}
      required={props.required}
      value={props.value}
    />
  );
}
