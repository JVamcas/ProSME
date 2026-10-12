"use client";

import type { RJSFSchema, WidgetProps } from "@rjsf/utils";
import { CheckboxField } from "@/shared/ui/FormField";

export function FormCheckboxWidget(
  props: WidgetProps<Record<string, unknown>, RJSFSchema>,
) {
  return (
    <CheckboxField
      autoFocus={props.autofocus}
      checked={props.value === true}
      description={props.schema.description}
      disabled={props.disabled || props.readonly}
      error={props.rawErrors?.join(" ") || undefined}
      id={props.id}
      label={
        <span>
          {props.label}
          {props.required ? (
            <span className="ml-1 text-brand-orange" aria-label="required">*</span>
          ) : null}
        </span>
      }
      name={props.htmlName ?? props.id}
      onBlur={() => props.onBlur(props.id, props.value === true)}
      onChange={(event) => props.onChange(event.target.checked)}
      onFocus={() => props.onFocus(props.id, props.value === true)}
      required={props.required}
    />
  );
}
