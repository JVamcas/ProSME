"use client";

import { useId } from "react";
import { useController, useFormContext } from "react-hook-form";

import { RichTextEditor } from "@/shared/ui/RichTextEditor";

type FormRichTextFieldProps = {
  className?: string;
  disabled?: boolean;
  label: string;
  name: string;
  placeholder?: string;
  parameters?: readonly { label: string; value: string }[];
  required?: boolean;
};

export function FormRichTextField({
  className,
  disabled = false,
  label,
  name,
  placeholder,
  parameters,
  required = false,
}: FormRichTextFieldProps) {
  const form = useFormContext();
  const { field, fieldState } = useController({ control: form.control, name });
  const id = `${useId()}-editor`;
  return (
    <RichTextEditor
      className={className}
      disabled={disabled}
      error={fieldState.error?.message}
      id={id}
      label={label}
      onBlur={field.onBlur}
      onChange={field.onChange}
      placeholder={placeholder}
      parameters={parameters}
      required={required}
      value={typeof field.value === "string" ? field.value : ""}
    />
  );
}
