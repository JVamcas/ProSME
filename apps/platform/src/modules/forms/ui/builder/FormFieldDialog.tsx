"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { FormProvider, useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { GeneralButton } from "@/components/ui/button";
import { DraggableDialog } from "@/components/ui/draggable-dialog";
import { CheckboxField } from "@/components/ui/form-field";
import { FormInput, FormSelect, FormTextarea } from "@/components/ui/form-fields";
import { formFieldSchema } from "@/modules/forms/api/FormSchemas";
import {
  formFieldTypes,
  type FormField,
  type FormFieldType,
  type FormSection,
} from "@/modules/forms/FormTypes";

type FieldDialogValues = z.input<typeof formFieldSchema>;

const fieldTypeLabels: Record<FormFieldType, string> = {
  CURRENCY: "Currency",
  DATE: "Date",
  DOCUMENT: "Document",
  MULTI_SELECT: "Multi Select",
  NUMBER: "Number",
  PERCENTAGE: "Percentage",
  SINGLE_SELECT: "Single Select",
  TEXT: "Text",
  TEXTAREA: "Textarea",
  YES_NO: "Yes/No",
};

function defaultField(sectionId: string, order: number): FieldDialogValues {
  return {
    columnSpan: 1,
    helpText: "",
    key: "",
    label: "",
    maximum: undefined,
    maxLength: undefined,
    minimum: undefined,
    minLength: undefined,
    options: [],
    order,
    required: false,
    sectionId,
    type: "TEXT",
  };
}

function SelectOptions({
  append,
  fields,
  remove,
}: {
  append: (option: { key: string; label: string; order: number }) => void;
  fields: { id: string }[];
  remove: (index: number) => void;
}) {
  return (
    <fieldset className="space-y-3 rounded-xl border border-brand-navy/15 p-4">
      <legend className="px-2 text-sm font-bold text-brand-navy">
        Select options
      </legend>
      {fields.map((option, index) => (
        <div
          className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
          key={option.id}
        >
          <FormInput
            label="Option key"
            name={`options.${index}.key`}
            required
          />
          <FormInput
            label="Option label"
            name={`options.${index}.label`}
            required
          />
          <GeneralButton
            onClick={() => remove(index)}
            type="button"
            variant="outline"
          >
            Remove
          </GeneralButton>
        </div>
      ))}
      <GeneralButton
        onClick={() => {
          const order = fields.length + 1;
          append({ key: `OPTION_${order}`, label: "Option", order });
        }}
        type="button"
        variant="outline"
      >
        Add option
      </GeneralButton>
    </fieldset>
  );
}

function FormFieldDialogContent({
  field,
  nextOrder,
  onClose,
  onSave,
  sectionColumnSpan,
  sectionId,
}: {
  field?: FormField;
  nextOrder: number;
  onClose: () => void;
  onSave: (field: FormField) => Promise<void>;
  sectionColumnSpan: FormSection["columnSpan"];
  sectionId: string;
}) {
  const form = useForm<
    z.input<typeof formFieldSchema>,
    unknown,
    z.output<typeof formFieldSchema>
  >({
    defaultValues: field ?? defaultField(sectionId, nextOrder),
    resolver: zodResolver(formFieldSchema),
  });
  const type = useWatch({ control: form.control, name: "type" });
  const options = useFieldArray({ control: form.control, name: "options" });

  useEffect(() => {
    if (type !== "SINGLE_SELECT" && type !== "MULTI_SELECT") {
      form.setValue("options", []);
    }
    if (!["NUMBER", "CURRENCY", "PERCENTAGE"].includes(type)) {
      form.setValue("minimum", undefined);
      form.setValue("maximum", undefined);
    }
    if (type !== "TEXT" && type !== "TEXTAREA") {
      form.setValue("minLength", undefined);
      form.setValue("maxLength", undefined);
    }
  }, [form, type]);

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSave(values);
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save the field.",
      );
    }
  });

  return (
    <DraggableDialog
      isOpen
      onClose={onClose}
      title={field ? "Edit field" : "Add field"}
    >
      <FormProvider {...form}>
        <form className="grid gap-4" onSubmit={submit}>
          <FormInput
            label="Field key"
            name="key"
            placeholder="REGISTERED_NAME"
            required
          />
          <FormInput label="Label" name="label" required />
          <FormSelect
            items={formFieldTypes.map((value) => ({
              label: fieldTypeLabels[value],
              value,
            }))}
            label="Field type"
            name="type"
            required
          />
          <FormSelect
            items={[
              { label: "One column", value: 1 },
              { label: "Two columns", value: 2 },
              { label: "Three columns", value: 3 },
            ].slice(0, sectionColumnSpan)}
            label="Field width"
            name="columnSpan"
            required
          />
          <FormTextarea label="Help text" name="helpText" />
          <CheckboxField label="Required" name="required" />
          {["NUMBER", "CURRENCY", "PERCENTAGE"].includes(type) ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormInput label="Minimum" name="minimum" type="number" />
              <FormInput label="Maximum" name="maximum" type="number" />
            </div>
          ) : null}
          {type === "TEXT" || type === "TEXTAREA" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormInput
                label="Minimum length"
                min={0}
                name="minLength"
                step={1}
                type="number"
              />
              <FormInput
                label="Maximum length"
                min={0}
                name="maxLength"
                step={1}
                type="number"
              />
            </div>
          ) : null}
          {type === "SINGLE_SELECT" || type === "MULTI_SELECT" ? (
            <SelectOptions
              append={options.append}
              fields={options.fields}
              remove={(index) => {
                options.remove(index);
                const remaining = form.getValues("options") ?? [];
                form.setValue(
                  "options",
                  remaining.map((option, optionIndex) => ({
                    ...option,
                    order: optionIndex + 1,
                  })),
                );
              }}
            />
          ) : null}
          <div className="flex justify-end">
            <GeneralButton
              disabled={form.formState.isSubmitting}
              type="submit"
            >
              {form.formState.isSubmitting ? "Saving…" : "Save field"}
            </GeneralButton>
          </div>
        </form>
      </FormProvider>
    </DraggableDialog>
  );
}

export function FormFieldDialog({
  field,
  isOpen,
  nextOrder,
  onClose,
  onSave,
  sectionColumnSpan,
  sectionId,
}: {
  field?: FormField;
  isOpen: boolean;
  nextOrder: number;
  onClose: () => void;
  onSave: (field: FormField) => Promise<void>;
  sectionColumnSpan?: FormSection["columnSpan"];
  sectionId?: string;
}) {
  if (!isOpen || !sectionId || !sectionColumnSpan) return null;
  return (
    <FormFieldDialogContent
      field={field}
      key={field?.id ?? `${sectionId}-${nextOrder}`}
      nextOrder={nextOrder}
      onClose={onClose}
      onSave={onSave}
      sectionColumnSpan={sectionColumnSpan}
      sectionId={sectionId}
    />
  );
}
