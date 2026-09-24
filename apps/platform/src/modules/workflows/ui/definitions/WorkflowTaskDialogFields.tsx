"use client";

import { GeneralButton } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/form-field";
import type { ConditionFieldDefinition } from "@/modules/conditions/domain/ConditionConfiguration";
import {
  FormInput,
  FormSelect,
  FormTextarea,
} from "@/components/ui/form-fields";
import { WorkflowContextFieldConfiguration } from "./WorkflowContextFieldConfiguration";
import { WorkflowChecklistConfiguration } from "./WorkflowChecklistConfiguration";
import { permissionCatalogue } from "@/auth/authorization/permissions";

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

export function WorkflowTaskDialogFields({
  actionItems,
  actionKeys,
  assignmentItems,
  assignmentMode,
  contextFieldItems,
  contextFieldKeys,
  contextFieldsPending,
  formItems,
  formVersionId,
  formsPending,
  mutationError,
  mutationPending,
  onActionKeysChange,
  onContextFieldKeysChange,
}: {
  actionItems: { disabled?: boolean; label: string; value: string }[];
  actionKeys: string[];
  assignmentItems: { label: string; value: string }[];
  assignmentMode: "ROLE" | "NAMED_USER";
  contextFieldItems: readonly ConditionFieldDefinition[];
  contextFieldKeys: readonly string[];
  contextFieldsPending: boolean;
  formItems: { label: string; value: string }[];
  formVersionId: string;
  formsPending: boolean;
  mutationError?: Error | null;
  mutationPending: boolean;
  onActionKeysChange: (values: string[]) => void;
  onContextFieldKeysChange: (values: string[]) => void;
}) {
  return (
    <>
      <TaskIdentityFields />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormSelect
          items={formItems}
          label="Form version"
          name="formVersionId"
          infoTooltip="The form used to capture details by the reviewer."
          placeholder={formsPending ? "Loading forms…" : "No form selected"}
          value={formVersionId}
        />
        <FormSelect
          infoTooltip="Only these Stage Actions will be presented when a reviewer works on this task."
          items={actionItems}
          label="Workflow actions"
          multiple
          name="actionKeys"
          onMultipleChange={onActionKeysChange}
          placeholder={
            actionItems.length
              ? "Select actions for this task"
              : "No stage actions"
          }
          value={actionKeys}
        />
      </div>
      <WorkflowChecklistConfiguration />
      <WorkflowContextFieldConfiguration
        disabled={!formVersionId}
        fields={contextFieldItems}
        isPending={contextFieldsPending}
        onChange={onContextFieldKeysChange}
        selectedKeys={contextFieldKeys}
      />

      <fieldset className="grid gap-4 rounded-lg border border-slate-200 p-4 sm:grid-cols-2">
        <legend className="px-1 text-sm font-semibold text-brand-navy">
          Element permissions
        </legend>
        <FormSelect
          items={permissionCatalogue.map((permission) => ({
            label: permission.label,
            value: permission.code,
          }))}
          label="View permission"
          name="viewPermission"
          required
        />
        <FormSelect
          items={permissionCatalogue.map((permission) => ({
            label: permission.label,
            value: permission.code,
          }))}
          label="Edit permission"
          name="editPermission"
          required
        />
        <FormSelect
          items={permissionCatalogue.map((permission) => ({
            label: permission.label,
            value: permission.code,
          }))}
          label="Decide permission"
          name="decidePermission"
          required
        />
        <FormSelect
          items={[
            { label: "Applicant visible", value: "APPLICANT_VISIBLE" },
            { label: "Internal only", value: "INTERNAL_ONLY" },
          ]}
          label="Visibility"
          name="visibility"
          required
        />
      </fieldset>

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
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormInput
          infoTooltip="How many people from the selected role will receive an individual copy of this task when the workflow runs. Named-user assignments are limited to one reviewer."
          label="Reviewer count"
          min={1}
          max={100}
          name="reviewerCount"
          registrationOptions={{ valueAsNumber: true }}
          required
          type="number"
        />
        <FormInput
          infoTooltip="How many assigned reviewers must finish their copy before this task is complete. This cannot exceed the reviewer count."
          label="Required completions"
          min={1}
          max={100}
          name="requiredCompletionCount"
          registrationOptions={{ valueAsNumber: true }}
          required
          type="number"
        />
        <FormInput
          label="Display order"
          min={1}
          name="displayOrder"
          registrationOptions={{ valueAsNumber: true }}
          required
          type="number"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <CheckboxField
          containerClassName="text-sm font-semibold text-brand-navy"
          description="The required completions must be more than half of the reviewer count—for example, 2 of 3 reviewers."
          label="Require majority quorum."
          name="quorum"
        />
        <CheckboxField
          containerClassName="text-sm font-semibold text-brand-navy"
          label="Require conflict-of-interest clearance"
          name="coiRequired"
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
