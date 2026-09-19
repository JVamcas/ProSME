"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useRef } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";

import { formFieldSchema } from "@/modules/forms/api/FormSchemas";
import type { FormField } from "@/modules/forms/FormTypes";
import { z } from "zod";

export type FieldDialogValues = z.input<typeof formFieldSchema>;

const dataTypeByInput = {
  CHECKBOX: "BOOLEAN",
  DATE: "DATE",
  MONEY: "MONEY",
  NUMBER: "INTEGER",
  RADIO: "TEXT",
  SELECT: "TEXT",
  TEXT: "TEXT",
  TEXTAREA: "TEXT",
} as const;

function emptyField(): FieldDialogValues {
  return {
    code: "",
    columnIndex: 1,
    columnSpan: 1,
    dataType: "TEXT",
    helpText: "",
    inputType: "TEXT",
    label: "",
    options: [],
    placeholder: "",
    required: false,
    rowIndex: 1,
    validation: {},
  };
}

export function useFormFieldDialogController(field?: FormField) {
  const initialField = useMemo(
    () => (
      field
        ? { ...field, validation: field.validation ?? {} }
        : emptyField()
    ),
    [field],
  );
  const form = useForm<FieldDialogValues>({
    defaultValues: initialField,
    resolver: zodResolver(formFieldSchema),
  });
  const inputType = useWatch({ control: form.control, name: "inputType" });
  const options = useFieldArray({ control: form.control, name: "options" });
  const previousInputType = useRef(inputType);

  useEffect(() => {
    previousInputType.current = initialField.inputType;
    form.reset(initialField);
  }, [form, initialField]);

  useEffect(() => {
    if (previousInputType.current === inputType) return;
    previousInputType.current = inputType;
    form.setValue("dataType", dataTypeByInput[inputType]);
    if (inputType !== "SELECT" && inputType !== "RADIO") {
      form.setValue("options", []);
    }
    const validation = form.getValues("validation") as Record<string, unknown>;
    if (inputType === "TEXT" || inputType === "TEXTAREA") {
      form.setValue("validation", {
        maxLength: validation.maxLength,
        minLength: validation.minLength,
      });
    } else if (inputType === "NUMBER" || inputType === "MONEY") {
      form.setValue("validation", {
        max: validation.max,
        min: validation.min,
      });
    } else {
      form.setValue("validation", {});
    }
  }, [form, inputType]);

  return { form, inputType, options };
}
