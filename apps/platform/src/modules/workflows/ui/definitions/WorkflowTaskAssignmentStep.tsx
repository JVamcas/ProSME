"use client";

import { useFormContext, useWatch } from "react-hook-form";

import { CheckboxField } from "@/components/ui/form-field";
import { FormInput, FormSelect } from "@/components/ui/form-fields";
import type { WorkflowTaskFormValues } from "./WorkflowTaskFormSchema";

function CompletionThresholdValueField() {
  const { control } = useFormContext<WorkflowTaskFormValues>();
  const completionMode = useWatch({ control, name: "completionMode" });

  if (completionMode === "COUNT") {
    return (
      <FormInput
        infoTooltip="How many assigned reviewers must complete the task."
        label="Required completions"
        max={100}
        min={1}
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
        max={100}
        min={1}
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
};

export function WorkflowTaskAssignmentStep({
  assignmentItems,
  assignmentMode,
}: Props) {
  const { control } = useFormContext<WorkflowTaskFormValues>();
  const taskType = useWatch({ control, name: "taskType" });

  return (
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
        max={taskType === "STAGE_DECISION" ? 1 : 100}
        min={1}
        name="reviewerCount"
        registrationOptions={{ valueAsNumber: true }}
        required
        type="number"
      />
      {taskType === "CONTRIBUTING" ? (
        <>
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
        </>
      ) : null}
      <CheckboxField
        containerClassName="mt-4 text-sm font-semibold text-brand-navy sm:col-span-2"
        label="Required before the stage can complete"
        name="required"
      />
    </div>
  );
}
