"use client";

import {
  FormDatePickerField,
  type FormDatePickerFieldProps,
} from "./FormDatePickerField";

export type FormDateInputProps = FormDatePickerFieldProps;

export function FormDateInput(props: FormDateInputProps) {
  return <FormDatePickerField {...props} />;
}
