"use client";

import {
  FormProvider,
  type UseFormReturn,
} from "react-hook-form";

import { GeneralButton } from "@/components/ui/button";
import type { FieldDialogValues } from "./FormFieldDialogController";
import { FormFieldDialogBody } from "./FormFieldDialogBody";

export function FieldDialogForm({
  form,
  inputType,
  onSubmit,
  options,
}: {
  form: UseFormReturn<FieldDialogValues>;
  inputType: string;
  onSubmit: (values: FieldDialogValues) => void;
  options: {
    append: (value: { code: string; label: string; position: number }) => void;
    fields: { id: string }[];
    remove: (index: number) => void;
  };
}) {
  const submit = form.handleSubmit(onSubmit);
  return (
    <FormProvider {...form}>
      <form className="grid gap-4" onSubmit={submit}>
        <FormFieldDialogBody
          append={options.append}
          fields={options.fields}
          inputType={inputType}
          remove={options.remove}
        />
        <GeneralButton type="submit">Save field</GeneralButton>
      </form>
    </FormProvider>
  );
}
