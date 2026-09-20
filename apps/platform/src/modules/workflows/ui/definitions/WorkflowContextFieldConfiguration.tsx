"use client";

import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";

import { GeneralButton } from "@/components/ui/button";
import { FormInput, FormSelect } from "@/components/ui/form-fields";
import type { WorkflowTaskFormValues } from "./WorkflowTaskFormSchema";

export function WorkflowContextFieldConfiguration({
  disabled,
}: {
  disabled: boolean;
}) {
  const { control } = useFormContext<WorkflowTaskFormValues>();
  const fields = useFieldArray({ control, name: "contextFields" });

  return (
    <fieldset
      className="space-y-3 rounded-xl border border-brand-navy/15 p-4"
      disabled={disabled}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <legend className="text-sm font-bold text-brand-navy">
            Read-only runtime context
          </legend>
          <p className="mt-1 text-xs text-brand-navy/55">
            Expose typed values using stable application, Funding Call,
            workflow, Stage or Task paths.
          </p>
        </div>
        <GeneralButton
          disabled={disabled}
          onClick={() => fields.append({ key: "", label: "", type: "TEXT" })}
          size="compact"
          type="button"
          variant="outline"
        >
          <Plus className="size-4" /> Add context field
        </GeneralButton>
      </div>
      {fields.fields.map((field, index) => (
        <div
          className="grid gap-3 rounded-lg border border-brand-navy/10 p-3 md:grid-cols-[1fr_1fr_9rem_auto]"
          key={field.id}
        >
          <FormInput
            label="Stable path"
            name={`contextFields.${index}.key`}
            placeholder="application.custom_metric"
          />
          <FormInput
            label="Label"
            name={`contextFields.${index}.label`}
            placeholder="Requested amount"
          />
          <FormSelect
            items={[
              { label: "Text", value: "TEXT" },
              { label: "Number", value: "NUMBER" },
              { label: "Yes / No", value: "BOOLEAN" },
              { label: "Date", value: "DATE" },
            ]}
            label="Value type"
            name={`contextFields.${index}.type`}
          />
          <GeneralButton
            aria-label={`Remove context field ${index + 1}`}
            className="self-end"
            onClick={() => fields.remove(index)}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Trash2 className="size-4" />
          </GeneralButton>
        </div>
      ))}
      {!fields.fields.length ? (
        <p className="text-sm text-brand-navy/55">
          No runtime context is exposed to this form.
        </p>
      ) : null}
    </fieldset>
  );
}
