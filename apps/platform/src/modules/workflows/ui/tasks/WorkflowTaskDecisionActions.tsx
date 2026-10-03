"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, type Ref } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";

import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { CheckboxField } from "@/components/ui/form-field";
import {
  FormInput,
  FormSelect,
  FormTextarea,
} from "@/components/ui/form-fields";
import type { DropdownButtonItem } from "@/shared/ui/DropdownButton";
import type {
  TaskDetail,
  WorkflowTaskAction,
} from "@/modules/work-queue/TaskTypes";
import { useExecuteWorkflowTaskAction } from "@/modules/work-queue/WorkQueueHooks";
import { WorkflowTaskActions } from "@/modules/workflows/ui/tasks/WorkflowTaskActions";
import { isWorkflowStageDecisionAction } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
import {
  actionFormDefaults,
  actionFormSchema,
  actionInput,
  type ActionValues,
} from "./WorkflowTaskActionForm";
import { WorkflowTaskEscalationFields } from "./WorkflowTaskEscalationFields";
import { WorkflowTaskInformationRequestFields } from "./WorkflowTaskInformationRequestFields";

function DecisionForm({
  action,
  beforeAction,
  onCancel,
  onSuccess,
  task,
}: {
  action: WorkflowTaskAction;
  beforeAction?: () => Promise<void>;
  onCancel: () => void;
  onSuccess: () => void;
  task: TaskDetail;
}) {
  const router = useRouter();
  const execution = useExecuteWorkflowTaskAction(task.taskInstanceId);
  const form = useForm<ActionValues>({
    defaultValues: actionFormDefaults(action),
    resolver: zodResolver(actionFormSchema(action)),
  });
  const submit = form.handleSubmit(async (values) => {
    try {
      if (beforeAction) {
        await beforeAction();
      }
      const result = await execution.mutateAsync({
        actionKey: action.key,
        input: {
          expectedRuntimeVersion: action.runtimeVersion,
          input: actionInput(action, values),
          sourceStageInstanceId: task.stageInstanceId,
          taskId: task.taskInstanceId,
        },
        workflowInstanceId: task.workflowInstanceId,
      });
      const targetStageNames = result.transition.targets
        .filter((target) => target.targetStageInstanceId)
        .map((target) => target.targetStageName)
        .join(", ");
      toast.success(
        targetStageNames
          ? `Application advanced to ${targetStageNames}.`
          : `${action.label} recorded.`,
      );
      onSuccess();
      router.push("/admin/work-queue");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to complete this action.",
      );
    }
  });
  return (
    <FormProvider {...form}>
      <ConfirmationDialog
        size="xl"
        confirmText={`Submit`}
        confirmVariant={"primary"}
        isLoading={form.formState.isSubmitting || execution.isPending}
        isOpen
        loadingText="Submitting…"
        message={
          <div className="space-y-4">
            {action.actionType === "REQUEST_INFORMATION" ? (
              <WorkflowTaskInformationRequestFields
                action={action}
                task={task}
              />
            ) : null}
            {action.actionType === "ESCALATE" ? (
              <WorkflowTaskEscalationFields action={action} />
            ) : null}
            {action.actionType === "RETURN" || action.actionType === "REFER" ? (
              <FormSelect
                label={
                  action.actionType === "RETURN"
                    ? "Stage to reopen"
                    : "Refer to stage"
                }
                name="targetStageDefinitionId"
                placeholder="Choose a stage"
                items={(action.requiredInput.destinationStages ?? []).map(
                  (stage) => ({
                    label: stage.name,
                    value: stage.id,
                  }),
                )}
                required
              />
            ) : null}
            {action.actionType === "RETURN" ? (
              <FormSelect
                label="Responses in the reopened stage"
                name="dataHandling"
                items={[
                  { label: "Retain previous responses", value: "RETAIN" },
                  { label: "Start with empty responses", value: "CLEAR" },
                ]}
                required
              />
            ) : null}
            {action.actionType === "REFER" ? (
              <>
                <FormSelect
                  label="Current task during referral"
                  name="sourceTaskBehavior"
                  items={[
                    {
                      label: "Block until referral completes",
                      value: "BLOCKED",
                    },
                    { label: "Keep open", value: "OPEN" },
                  ]}
                  required
                />
                <CheckboxField
                  label="Return to this task after completion"
                  name="returnToReferrer"
                />
                <FormTextarea
                  label="Question for the reviewer"
                  name="question"
                  required
                />
              </>
            ) : null}
            {action.requiredInput.reviewDate.required ? (
              <FormInput
                label="Review date"
                name="reviewDate"
                required
                type="date"
              />
            ) : null}
            {action.actionType !== "REQUEST_INFORMATION" ? (
              <FormTextarea
                label="Notes"
                maxLength={action.requiredInput.reason.maxLength}
                name="reason"
                required={action.requiredInput.reason.required}
              />
            ) : null}
            {action.requiredInput.confirmation.required ? (
              <CheckboxField
                label={
                  action.requiredInput.confirmation.message ??
                  "Confirm this action"
                }
                name="confirmed"
              />
            ) : null}
          </div>
        }
        onCancel={() => {
          if (!form.formState.isSubmitting && !execution.isPending) onCancel();
        }}
        onConfirm={() => void submit()}
        title={action.label}
      />
    </FormProvider>
  );
}

export function WorkflowTaskDecisionActions({
  eligibilityActionRef,
  additionalItems = [],
  beforeAction,
  task,
  showDecisionActions = true,
}: {
  showDecisionActions?: boolean;
  eligibilityActionRef?: Ref<HTMLDivElement>;
  additionalItems?: DropdownButtonItem[];
  beforeAction?: () => Promise<void>;
  task: TaskDetail;
}) {
  // Form finalization changes live action availability; retain this selection
  // until cancellation or successful execution so the dialog stays mounted.
  const [selected, setSelected] = useState<WorkflowTaskAction | null>(null);
  const visibleActions = task.actions.filter(
    (action) =>
      showDecisionActions || !isWorkflowStageDecisionAction(action.actionType),
  );
  const canChooseAction =
    task.taskStatus !== "COMPLETED" &&
    (visibleActions.length > 0 ||
      additionalItems.length > 0 ||
      Boolean(eligibilityActionRef));
  const actionFinalizer =
    selected && isWorkflowStageDecisionAction(selected.actionType)
      ? beforeAction
      : undefined;

  return (
    <div className="space-y-4">
      {canChooseAction ? (
        <WorkflowTaskActions
          actions={visibleActions}
          eligibilityActionRef={eligibilityActionRef}
          additionalItems={additionalItems}
          disabled={Boolean(selected)}
          onSelect={(key) => {
            const action = visibleActions.find(
              (candidate) => candidate.key === key,
            );
            if (action?.available) setSelected(action);
          }}
        />
      ) : null}
      {selected ? (
        <DecisionForm
          action={selected}
          beforeAction={actionFinalizer}
          key={selected.key}
          onCancel={() => setSelected(null)}
          onSuccess={() => setSelected(null)}
          task={task}
        />
      ) : null}
    </div>
  );
}
