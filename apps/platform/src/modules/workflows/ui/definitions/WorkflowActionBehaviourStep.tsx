"use client";

import { CheckboxField } from "@/components/ui/form-field";
import { FormSelect } from "@/components/ui/form-fields";
import {
  isWorkflowStageDecisionAction,
  type WorkflowActionType,
} from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
import type {
  WorkflowAssignmentOptions,
  WorkflowStageInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { WorkflowActionConfigurationFields } from "./WorkflowActionConfigurationFields";

type Props = {
  actionExists: boolean;
  actionType: WorkflowActionType;
  assignmentOptions: WorkflowAssignmentOptions;
  deferTargetType: "DATE" | "FUNDING_CALL";
  escalationTargetType: "ROLE" | "USER";
  rejectionOutcomeType: "TERMINAL" | "TRANSITION";
  stage: WorkflowStageInput;
  taskStableKeys: string[];
  onTaskChange: (values: string[]) => void;
};

export function WorkflowActionBehaviourStep({
  actionExists,
  actionType,
  assignmentOptions,
  deferTargetType,
  escalationTargetType,
  rejectionOutcomeType,
  stage,
  taskStableKeys,
  onTaskChange,
}: Props) {
  const decisionTask = stage.tasks.find(
    (task) => task.taskType === "STAGE_DECISION",
  );
  const decisionAction = isWorkflowStageDecisionAction(actionType);

  return (
    <fieldset className="grid gap-4 sm:grid-cols-2">
      <legend className="sr-only">Action behaviour</legend>
      {decisionAction ? (
        <div className="sm:col-span-2">
          <p className="text-sm font-medium text-brand-navy">Workflow task</p>
          <p className="mt-2 rounded-xl border border-brand-navy/10 bg-brand-navy/3 px-4 py-3 text-sm text-brand-navy/70">
            {decisionTask
              ? `Automatically assigned to stage-decision task: ${decisionTask.name}.`
              : "Add the stage-decision task to assign this action automatically."}
          </p>
        </div>
      ) : (
        <FormSelect
          containerClassName="sm:col-span-2"
          disabled={!actionExists}
          infoTooltip={
            actionExists
              ? "Select every task in which this common action should appear."
              : "New common actions are assigned to all tasks when first saved. Edit the action afterward to remove it from individual tasks."
          }
          items={stage.tasks.map((task) => ({
            label: task.name,
            value: task.stableKey,
          }))}
          label="Available on tasks"
          multiple
          name="taskStableKeys"
          onMultipleChange={onTaskChange}
          placeholder={
            stage.tasks.length
              ? "Select tasks"
              : "Common actions will be added when tasks are created"
          }
          value={taskStableKeys}
        />
      )}
      {actionType !== "REJECT" ? (
        <CheckboxField
          containerClassName="sm:col-span-2"
          label="Require a reason code"
          name="reasonCodeRequired"
        />
      ) : null}
      <WorkflowActionConfigurationFields
        actionType={actionType}
        assignmentOptions={assignmentOptions}
        deferTargetType={deferTargetType}
        escalationTargetType={escalationTargetType}
        hideRejectionOutcomeSelector
        rejectionOutcomeType={rejectionOutcomeType}
      />
    </fieldset>
  );
}
