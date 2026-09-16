"use client";

import { GeneralButton } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/form-field";
import { FormInput, FormSelect } from "@/components/ui/form-fields";

function TaskIdentityFields() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormInput label="Task code" name="code" placeholder="FINANCE_REVIEW" />
      <FormInput label="Task name" name="name" placeholder="Review finance" />
    </div>
  );
}

export function WorkflowTaskDialogFields({
  assignmentItems,
  assignmentMode,
  formItems,
  formsPending,
  mutationError,
  mutationPending,
}: {
  assignmentItems: { label: string; value: string }[];
  assignmentMode: "ROLE" | "USER";
  formItems: { label: string; value: string }[];
  formsPending: boolean;
  mutationError?: Error | null;
  mutationPending: boolean;
}) {
  return (
    <>
      <TaskIdentityFields />
      <FormSelect
        items={formItems}
        label="Published form version"
        name="formVersionId"
        placeholder={formsPending ? "Loading forms…" : "Select a form"}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormSelect
          items={[
            { label: "Configured role", value: "ROLE" },
            { label: "Specific user", value: "USER" },
          ]}
          label="Assignment source"
          name="assignmentMode"
        />
        <FormSelect
          items={assignmentItems}
          label={assignmentMode === "ROLE" ? "Assigned role" : "Assigned user"}
          name="assignmentTarget"
          placeholder="Select an assignee"
        />
      </div>
      <CheckboxField
        containerClassName="mt-8 text-sm font-semibold text-brand-navy"
        label="Required before the stage can complete"
        name="required"
      />
      {mutationError ? (
        <p className="text-sm text-red-700" role="alert">
          {mutationError.message}
        </p>
      ) : null}
      <div className="flex justify-end">
        <GeneralButton disabled={mutationPending} type="submit">
          {mutationPending ? "Saving…" : "Save task"}
        </GeneralButton>
      </div>
    </>
  );
}
