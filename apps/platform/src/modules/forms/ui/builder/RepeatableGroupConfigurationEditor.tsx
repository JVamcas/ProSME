"use client";

import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import type { z } from "zod";

import { GeneralButton, IconButton } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/form-field";
import { FormInput, FormSelect } from "@/components/ui/form-fields";
import { formFieldSchema } from "@/modules/forms/api/FormSchemas";
import {
  repeatableItemFieldTypes,
  type RepeatableItemFieldType,
} from "@/modules/forms/FormTypes";

type FieldDialogValues = z.input<typeof formFieldSchema>;

const supportedBuilderTypes = repeatableItemFieldTypes.filter(
  (type) => !["SINGLE_SELECT", "MULTI_SELECT"].includes(type),
);

function typeLabel(type: RepeatableItemFieldType) {
  if (type === "YES_NO") return "Yes/No";
  return type
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (character) => character.toUpperCase());
}

function defaultItem(order: number) {
  return {
    columnSpan: 1 as const,
    helpText: "",
    key: `FIELD_${order}`,
    label: `Field ${order}`,
    maximum: undefined,
    maxLength: undefined,
    minimum: undefined,
    minLength: undefined,
    options: [],
    order,
    required: false,
    type: "TEXT" as const,
  };
}

function RepeatableItemEditor({
  index,
  onRemove,
}: {
  index: number;
  onRemove: () => void;
}) {
  const form = useFormContext<FieldDialogValues>();
  const type = useWatch({
    control: form.control,
    name: `repeatable.fields.${index}.type`,
  });
  return (
    <section className="rounded-xl border border-brand-navy/10 bg-brand-cream/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-bold text-brand-navy">
          Item field {index + 1}
        </h4>
        <IconButton
          label={`Remove item field ${index + 1}`}
          onClick={onRemove}
          type="button"
          variant="ghost"
        >
          <Trash2 aria-hidden="true" className="size-4" />
        </IconButton>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <FormInput
          label="Field key"
          name={`repeatable.fields.${index}.key`}
          required
        />
        <FormInput
          label="Field label"
          name={`repeatable.fields.${index}.label`}
          required
        />
        <FormSelect
          items={supportedBuilderTypes.map((value) => ({
            label: typeLabel(value),
            value,
          }))}
          label="Field type"
          name={`repeatable.fields.${index}.type`}
          required
        />
        <FormSelect
          items={[
            { label: "One column", value: 1 },
            { label: "Two columns", value: 2 },
            { label: "Three columns", value: 3 },
          ]}
          label="Field width"
          name={`repeatable.fields.${index}.columnSpan`}
          required
        />
        <FormInput
          label="Help text"
          name={`repeatable.fields.${index}.helpText`}
        />
        <CheckboxField
          label="Required"
          name={`repeatable.fields.${index}.required`}
        />
        {type && ["NUMBER", "CURRENCY", "PERCENTAGE"].includes(type) ? (
          <>
            <FormInput
              label="Minimum"
              name={`repeatable.fields.${index}.minimum`}
              type="number"
            />
            <FormInput
              label="Maximum"
              name={`repeatable.fields.${index}.maximum`}
              type="number"
            />
          </>
        ) : null}
      </div>
    </section>
  );
}

export function RepeatableGroupConfigurationEditor() {
  const form = useFormContext<FieldDialogValues>();
  const items = useFieldArray({
    control: form.control,
    name: "repeatable.fields",
  });

  function remove(index: number) {
    items.remove(index);
    const remaining = form.getValues("repeatable.fields") ?? [];
    form.setValue(
      "repeatable.fields",
      remaining.map((field, itemIndex) => ({
        ...field,
        order: itemIndex + 1,
      })),
    );
  }

  return (
    <fieldset className="space-y-4 rounded-xl border border-brand-navy/15 p-4">
      <legend className="px-2 text-sm font-bold text-brand-navy">
        Repeatable group configuration
      </legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormInput label="Item label" name="repeatable.itemLabel" required />
        <FormInput label="Add button label" name="repeatable.addLabel" required />
        <FormInput
          label="Minimum rows"
          min={0}
          name="repeatable.minimumItems"
          required
          type="number"
        />
        <FormInput
          label="Maximum rows"
          min={1}
          name="repeatable.maximumItems"
          required
          type="number"
        />
      </div>
      <div className="grid gap-3">
        {items.fields.map((field, index) => (
          <RepeatableItemEditor
            index={index}
            key={field.id}
            onRemove={() => remove(index)}
          />
        ))}
      </div>
      <GeneralButton
        onClick={() => items.append(defaultItem(items.fields.length + 1))}
        type="button"
        variant="outline"
      >
        <Plus aria-hidden="true" className="size-4" />
        Add item field
      </GeneralButton>
    </fieldset>
  );
}
