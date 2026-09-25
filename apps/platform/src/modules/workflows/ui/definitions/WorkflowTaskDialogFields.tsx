"use client";

import { useFormContext, useWatch } from "react-hook-form";

import { GeneralButton } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/form-field";
import {
  FormInput,
  FormSelect,
  FormTextarea,
} from "@/components/ui/form-fields";
import type { WorkflowTaskFormValues } from "./WorkflowTaskFormSchema";

function TaskIdentityFields() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormInput
        label="Stable key"
        name="stableKey"
        placeholder="FINANCE_REVIEW"
        required
      />
      <FormInput
        label="Task name"
        name="name"
        placeholder="Review finance"
        required
      />
      <FormInput
        containerClassName="sm:col-span-2"
        label="Display order"
        min={1}
        name="displayOrder"
        registrationOptions={{ valueAsNumber: true }}
        required
        type="number"
      />
      <FormTextarea
        containerClassName="sm:col-span-2"
        label="Description"
        name="description"
        placeholder="Describe the unit of work."
        rows={3}
      />
    </div>
  );
}

function CompletionThresholdValueField() {
  const { control } = useFormContext<WorkflowTaskFormValues>();
  const completionMode = useWatch({ control, name: "completionMode" });

  if (completionMode === "COUNT") {
    return (
      <FormInput
        infoTooltip="How many assigned reviewers must complete the task."
        label="Required completions"
        min={1}
        max={100}
        name="requiredCompletionCount"
        registrationOptions={{
          setValueAs: (value: string) => (value === "" ? null : Number(value)),
        }}
        required
        type="number"
      />
    );
  }

  if (completionMode === "PERCENT") {
    return (
      <FormInput
        infoTooltip="The percentage of assigned reviewers that must complete the task."
        label="Completion percentage"
        min={1}
        max={100}
        name="completionPercentage"
        registrationOptions={{
          setValueAs: (value: string) => (value === "" ? null : Number(value)),
        }}
        required
        type="number"
      />
    );
  }

  return null;
}

type Props = {
  assignmentItems: { label: string; value: string }[];
  assignmentMode: "ROLE" | "NAMED_USER";
  formItems: { label: string; value: string }[];
  formVersionId: string;
  formsPending: boolean;
  mutationPending: boolean;
};

export function WorkflowTaskDialogFields({
  assignmentItems,
  assignmentMode,
  formItems,
  formVersionId,
  formsPending,
  mutationPending,
}: Props) {
  return (
    <>
      <TaskIdentityFields />
      <div>
        <FormSelect
          items={formItems}
          label="Form version"
          name="formVersionId"
          infoTooltip="The form used to capture details by the reviewer."
          placeholder={formsPending ? "Loading forms…" : "No form selected"}
          value={formVersionId}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormSelect
          items={[
            { label: "Configured role", value: "ROLE" },
            { label: "Named-user override", value: "NAMED_USER" },
          ]}
          label="Assignment source"
          name="assignmentMode"
          required
        />
        <FormSelect
          items={assignmentItems}
          label={assignmentMode === "ROLE" ? "Assigned role" : "Assigned user"}
          name="assignmentTarget"
          placeholder="Select an assignee"
          required
        />
        <FormInput
          containerClassName="sm:col-span-2"
          infoTooltip="How many people from the selected role will receive an individual copy of this task when the workflow runs. Named-user assignments are limited to one reviewer."
          label="Reviewer count"
          min={1}
          max={100}
          name="reviewerCount"
          registrationOptions={{ valueAsNumber: true }}
          required
          type="number"
        />
        <FormSelect
          items={[
            { label: "All", value: "ALL" },
            { label: "Fixed count", value: "COUNT" },
            { label: "Percentage", value: "PERCENT" },
          ]}
          label="Completion threshold"
          name="completionMode"
          required
        />
        <CompletionThresholdValueField />
      </div>
      <CheckboxField
        containerClassName="mt-8 text-sm font-semibold text-brand-navy"
        label="Required before the stage can complete"
        name="required"
      />
      <div className="flex justify-end">
        <GeneralButton disabled={mutationPending} type="submit">
          {mutationPending ? "Saving…" : "Save task"}
        </GeneralButton>
      </div>
    </>
  );
}
