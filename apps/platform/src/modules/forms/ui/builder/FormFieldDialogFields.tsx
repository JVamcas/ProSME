"use client";

import { useFormContext, useWatch } from "react-hook-form";
import type { z } from "zod";
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
import { FormSelectOptionsTable } from "./FormSelectOptionsTable";
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
  COMMENT: "Comment",
  YES_NO: "Yes/No",
  CHECKBOX: "Checkbox",
  REPEATABLE_GROUP: "Repeatable Group",
  RICH_TEXT: "Rich Text",
};

export function FormFieldDialogFields({
  fields,
  sectionColumnSpan,
  step,
}: {
  step: "details" | "configuration";
  fields: readonly FormField[];
  sectionColumnSpan: FormSection["columnSpan"];
}) {
  const form = useFormContext<z.input<typeof formFieldSchema>>();
  const type = useWatch({ control: form.control, name: "type" });
  if (step === "details")
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
      </>
    );
  return (
    <>
      <FormInput label="Help text" name="helpText" />
      <CheckboxField label="Required" name="required" />
      {["NUMBER", "CURRENCY", "PERCENTAGE", "SCORE"].includes(type) ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput label="Minimum" name="minimum" type="number" />
          <FormInput label="Maximum" name="maximum" type="number" />
        </div>
      ) : null}
      {["TEXT", "TEXTAREA", "COMMENT"].includes(type) ? (
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
        <FormSelectOptionsTable />
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
