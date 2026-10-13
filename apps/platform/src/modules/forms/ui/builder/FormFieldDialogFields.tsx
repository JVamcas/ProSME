"use client";

import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import type { z } from "zod";
import { GeneralButton } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/form-field";
import {
  FormInput,
  FormSelect,
  FormTextarea,
} from "@/components/ui/form-fields";
import { formFieldSchema } from "../../api/FormSchemas";
import {
  formFieldTypes,
  type FormField,
  type FormFieldType,
  type FormSection,
} from "../../FormTypes";
import { ScoringAggregateSettings } from "./ScoringAggregateSettings";
import { DocumentFieldLimits } from "./DocumentFieldLimits";
import { RepeatableGroupConfigurationEditor } from "./RepeatableGroupConfigurationEditor";

const fieldTypeLabels: Record<FormFieldType, string> = {
  CURRENCY: "Currency",
  DATE: "Date",
  DOCUMENT: "Document",
  MULTI_SELECT: "Multi Select",
  NUMBER: "Number",
  SCORE: "Score",
  SCORING_AGGREGATE: "Scoring aggregate",
  PERCENTAGE: "Percentage",
  SINGLE_SELECT: "Single Select",
  TEXT: "Text",
  TEXTAREA: "Textarea",
  YES_NO: "Yes/No",
  CHECKBOX: "Checkbox",
  REPEATABLE_GROUP: "Repeatable Group",
  RICH_TEXT: "Rich Text",
};

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
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]" key={option.id}>
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

export function FormFieldDialogFields({
  fields,
  sectionColumnSpan,
}: {
  fields: readonly FormField[];
  sectionColumnSpan: FormSection["columnSpan"];
}) {
  const form = useFormContext<z.input<typeof formFieldSchema>>();
  const type = useWatch({ control: form.control, name: "type" });
  const options = useFieldArray({ control: form.control, name: "options" });
  return (
    <>
      {type === "CHECKBOX" ? (
        <FormTextarea label="Label" name="label" required />
      ) : (
        <FormInput label="Label" name="label" required />
      )}
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
      <FormInput label="Help text" name="helpText" />
      <CheckboxField label="Required" name="required" />
      {["NUMBER", "CURRENCY", "PERCENTAGE", "SCORE"].includes(type) ? (
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
      {type === "SCORING_AGGREGATE" ? (
        <ScoringAggregateSettings fields={fields} />
      ) : null}
      {type === "DOCUMENT" ? (
        <>
          <FormSelect
            label="Uploaded by"
            name="uploadedBy"
            items={[
              { label: "Applicant", value: "APPLICANT" },
              { label: "Any", value: "ANY" },
              { label: "Assigned reviewer", value: "ASSIGNED_REVIEWER" },
            ]}
          />
          <DocumentFieldLimits />
        </>
      ) : null}
      {type === "REPEATABLE_GROUP" ? (
        <RepeatableGroupConfigurationEditor />
      ) : null}
    </>
  );
}
