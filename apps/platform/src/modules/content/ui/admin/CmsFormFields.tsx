"use client";

import { getTranslation } from "@payloadcms/translations";
import {
  FieldDescription,
  useField,
  useTranslation,
  withCondition,
} from "@payloadcms/ui";
import type {
  SelectFieldClientProps,
  TextareaFieldClientProps,
  TextFieldClientProps,
  Validate,
} from "payload";
import { useCallback } from "react";

import { FormInput, FormSelect, FormTextarea } from "@/components/ui/form-fields";

type TextProps = TextFieldClientProps | TextareaFieldClientProps;

function CmsInputField({ field, path, validate, readOnly }: TextFieldClientProps) {
  const { maxLength, minLength, required } = field;
  const validator = useCallback<Validate>(
    (value, options) => validate?.(value, {
      ...options,
      name: field.name,
      type: "text",
      hasMany: false,
      maxLength,
      minLength,
      required,
    }) ?? true,
    [validate, field.name, maxLength, minLength, required],
  );

  const state = useField<string>({ potentiallyStalePath: path, validate: validator });
  return <CmsTextControl field={field} state={state} readOnly={readOnly} />;
}

function CmsTextareaField({ field, path, validate, readOnly }: TextareaFieldClientProps) {
  const { maxLength, minLength, required } = field;
  const validator = useCallback<Validate>(
    (value, options) => validate?.(value, {
      ...options,
      name: field.name,
      type: "textarea",
      maxLength,
      minLength,
      required,
    }) ?? true,
    [validate, field.name, maxLength, minLength, required],
  );
  const state = useField<string>({ potentiallyStalePath: path, validate: validator });
  return <CmsTextControl field={field} state={state} readOnly={readOnly} multiline />;
}

function CmsTextControl({ field, state, readOnly, multiline = false }: {
  field: TextProps["field"];
  state: ReturnType<typeof useField<string>>;
  readOnly?: boolean;
  multiline?: boolean;
}) {
  const { i18n } = useTranslation();
  const Control = multiline ? FormTextarea : FormInput;
  const description = field.admin?.description;
  const disabled = Boolean(readOnly || state.disabled);

  return (
    <div className="mb-6 font-sans">
      <Control
        id={`field-${state.path}`}
        name={state.path}
        label={getTranslation(field.label || field.name, i18n)}
        required={field.required}
        disabled={disabled}
        value={state.value ?? ""}
        maxLength={field.maxLength}
        minLength={field.minLength}
        placeholder={getTranslation(field.admin?.placeholder ?? "", i18n)}
        error={state.showError ? state.errorMessage : undefined}
        aria-describedby={description ? `${state.path}-description` : undefined}
        onChange={(event) => {
          if (!disabled) state.setValue(event.target.value);
        }}
      />
      {description ? (
        <div id={`${state.path}-description`}>
          <FieldDescription path={state.path} description={description} />
        </div>
      ) : null}
    </div>
  );
}

function CmsSelectField(props: SelectFieldClientProps) {
  const { field, path, readOnly, validate, onChange } = props;
  const { i18n } = useTranslation();
  const { options, required } = field;
  const validator = useCallback<Validate>(
    (value, validationOptions) => validate?.(value, {
      ...validationOptions,
      name: field.name,
      type: "select",
      hasMany: false,
      options,
      required,
    }) ?? true,
    [validate, field.name, options, required],
  );
  const state = useField<string>({ potentiallyStalePath: path, validate: validator });
  const disabled = Boolean(readOnly || state.disabled);
  const description = field.admin?.description;
  const items = options.map((option) => {
    if (typeof option === "string") {
      return { label: option, value: option };
    }
    const label = getTranslation(option.label, i18n);
    return { label: typeof label === "string" ? label : option.value, value: option.value };
  });

  return (
    <div className="mb-6 font-sans">
      <FormSelect
        id={`field-${state.path}`}
        name={state.path}
        label={getTranslation(field.label || field.name, i18n)}
        items={items}
        required={required}
        disabled={disabled}
        value={state.value ?? ""}
        error={state.showError ? state.errorMessage : undefined}
        aria-describedby={description ? `${state.path}-description` : undefined}
        onChange={(event) => {
          if (disabled) return;
          state.setValue(event.target.value);
          onChange?.(event.target.value);
        }}
      />
      {description ? (
        <div id={`${state.path}-description`}>
          <FieldDescription path={state.path} description={description} />
        </div>
      ) : null}
    </div>
  );
}

export const CmsFormInput = withCondition(CmsInputField);
export const CmsFormTextarea = withCondition(CmsTextareaField);
export const CmsFormSelect = withCondition(CmsSelectField);
