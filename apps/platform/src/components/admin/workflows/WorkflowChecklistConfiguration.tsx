"use client";

import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";

import { GeneralButton } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/form-field";
import { FormInput } from "@/components/ui/form-fields";
import type { WorkflowTaskFormValues } from "./WorkflowTaskFormSchema";

export function WorkflowChecklistConfiguration() {
  const form = useFormContext<WorkflowTaskFormValues>();
  const items = useFieldArray({
    control: form.control,
    name: "checklistItems",
  });
  return (
    <fieldset className="rounded-xl border border-brand-navy/15 p-4">
      <legend className="px-2 text-sm font-bold text-brand-navy">
        Checklist items
      </legend>
      <p className="mb-4 text-xs text-brand-navy/60">
        Items are copied into tasks from the published workflow version.
      </p>
      <div className="grid gap-4">
        {items.fields.map((item, index) => (
          <div
            className="grid gap-3 rounded-xl bg-brand-cream/60 p-3 md:grid-cols-[.7fr_1.3fr_auto]"
            key={item.id}
          >
            <FormInput label="Item code" name={`checklistItems.${index}.code`} />
            <FormInput label="Item label" name={`checklistItems.${index}.label`} />
            <div className="flex items-end gap-3 pb-2">
              <CheckboxField
                containerClassName="text-sm text-brand-navy"
                label="Required"
                name={`checklistItems.${index}.required`}
              />
              <GeneralButton
                aria-label={`Remove checklist item ${index + 1}`}
                onClick={() => items.remove(index)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </GeneralButton>
            </div>
          </div>
        ))}
      </div>
      <GeneralButton
        className="mt-4"
        onClick={() => items.append({
          code: `ITEM_${items.fields.length + 1}`,
          label: "Checklist item",
          required: true,
        })}
        size="sm"
        type="button"
        variant="outline"
      >
        <Plus aria-hidden="true" className="size-4" /> Add checklist item
      </GeneralButton>
    </fieldset>
  );
}
