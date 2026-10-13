"use client";

import { Controller, useFormContext, useWatch } from "react-hook-form";
import type { z } from "zod";
import { FormInput, FormSelect } from "@/components/ui/form-fields";
import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import {
  defaultFormValidationRuleSettings,
  type FormRuleValidationMode,
} from "../../domain/FormFieldRules";
import { uniqueStableKeyFromLabel } from "@/modules/workflows/domain/WorkflowStableKey";
import type { FormField } from "../../FormTypes";
import { formFieldSchema } from "../../api/FormSchemas";
import { FormConditionRuleEditor } from "./FormConditionRuleEditor";

export function FormFieldRulePanel({
  field,
  fields,
  precedingFields,
}: {
  field?: FormField;
  fields: readonly FormField[];
  precedingFields: readonly FormField[];
}) {
  const form = useFormContext<z.input<typeof formFieldSchema>>();
  const label = useWatch({ control: form.control, name: "label" });
  const type = useWatch({ control: form.control, name: "type" });
  const validation = useWatch({
    control: form.control,
    name: "rules.validationCondition",
  });
  const modes = useWatch({
    control: form.control,
    name: "rules.validationSettings.modes",
  });
  const current = {
    ...field,
    key:
      field?.key ??
      uniqueStableKeyFromLabel(
        label,
        fields.map((item) => item.key),
        "FIELD",
      ),
    label,
    type,
  } as FormField;
  const validationFields = [
    ...fields.filter((item) => item.key !== current.key),
    current,
  ];
  return (
    <div className="space-y-4">
      <Controller
        control={form.control}
        name="rules.validationCondition"
        render={({ field: condition }) => (
          <FormConditionRuleEditor
            addLabel="Add rule"
            removeLabel="Remove rule"
            title="Validation rules"
            fields={validationFields}
            value={condition.value as ConditionGroup | null | undefined}
            onChange={(value) => {
              condition.onChange(value);
              form.setValue(
                "rules.validationSettings",
                value
                  ? (form.getValues("rules.validationSettings") ??
                      defaultFormValidationRuleSettings)
                  : null,
              );
            }}
          />
        )}
      />
      {validation ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormInput
            label="Validation message"
            name="rules.validationSettings.message"
            required
          />
          <FormSelect
            items={[
              { label: "Draft save", value: "DRAFT" },
              { label: "Submission", value: "SUBMIT" },
            ]}
            label="Apply validation on"
            multiple
            name="rules.validationSettings.modes"
            value={modes ?? defaultFormValidationRuleSettings.modes}
            onMultipleChange={(values) =>
              form.setValue(
                "rules.validationSettings.modes",
                values as FormRuleValidationMode[],
                { shouldValidate: true },
              )
            }
          />
          <FormSelect
            items={[
              {
                label: "Allow partial drafts; require inputs on submission",
                value: "DEFER_ON_DRAFT",
              },
              { label: "Reject whenever validation applies", value: "REJECT" },
            ]}
            label="Missing rule inputs"
            name="rules.validationSettings.missing"
          />
        </div>
      ) : null}
      <Controller
        control={form.control}
        name="visibilityCondition"
        render={({ field: condition }) => (
          <FormConditionRuleEditor
            fields={precedingFields}
            value={condition.value as ConditionGroup | null | undefined}
            onChange={condition.onChange}
          />
        )}
      />
      {(["editableCondition", "requiredCondition"] as const).map((name) => (
        <Controller
          control={form.control}
          key={name}
          name={`rules.${name}`}
          render={({ field: condition }) => (
            <FormConditionRuleEditor
              addLabel="Add rule"
              removeLabel="Remove rule"
              title={
                name === "editableCondition" ? "Editable when" : "Required when"
              }
              fields={precedingFields}
              value={condition.value as ConditionGroup | null | undefined}
              onChange={condition.onChange}
            />
          )}
        />
      ))}
      {form.formState.errors.rules ? (
        <p className="text-sm text-red-700" role="alert">
          Complete each rule and its validation settings before saving.
        </p>
      ) : null}
    </div>
  );
}
