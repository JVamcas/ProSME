"use client";

import {
  FormDatePickerField,
  type FormDatePickerFieldProps,
} from "./FormDatePickerField";

export type FormDateTimeInputProps = Omit<
  FormDatePickerFieldProps,
  "size" | "onBlurValue" | "onFocusValue"
>;

export function FormDateTimeInput(props: FormDateTimeInputProps) {
  return <FormDatePickerField {...props} withTime />;
}
