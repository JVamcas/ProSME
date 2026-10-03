"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, type Ref } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";

import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { CheckboxField } from "@/components/ui/form-field";
import { FormInput, FormTextarea } from "@/components/ui/form-fields";
import type { DropdownButtonItem } from "@/shared/ui/DropdownButton";
import type {
  TaskDetail,
  WorkflowTaskAction,
} from "@/modules/work-queue/TaskTypes";
import { useExecuteWorkflowTaskAction } from "@/modules/work-queue/WorkQueueHooks";
import { WorkflowTaskActions } from "@/modules/workflows/ui/tasks/WorkflowTaskActions";
import { isWorkflowStageDecisionAction } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
import {
  actionFormSchema,
  actionInput,
  type ActionValues,
} from "./WorkflowTaskActionForm";
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
    defaultValues: {
      confirmed: false,
      instructions: "",
      requestDetailedInformation: false,
      editableFieldPaths: [],
      question: "",
      reason: "",
      requestedDocumentRequirementIds: [],
      reviewDate: "",
    },
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
            <p>Confirm {action.label.toLowerCase()}?</p>
            {action.actionType === "REQUEST_INFORMATION" ? (
              <WorkflowTaskInformationRequestFields
                action={action}
                task={task}
              />
            ) : null}
            {action.actionType === "REFER" ? (
              <FormTextarea
                label="Question for the reviewer"
                name="question"
                required
              />
            ) : null}
            {action.requiredInput.reviewDate.required ? (
              <FormInput
                label="Review date"
                name="reviewDate"
                required
                type="date"
              />
            ) : null}
            <FormTextarea
              label="Reason"
              maxLength={action.requiredInput.reason.maxLength}
              name="reason"
              required={action.requiredInput.reason.required}
            />
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
}: {
  eligibilityActionRef?: Ref<HTMLDivElement>;
  additionalItems?: DropdownButtonItem[];
  beforeAction?: () => Promise<void>;
  task: TaskDetail;
}) {
  // Form finalization changes live action availability; retain this selection
  // until cancellation or successful execution so the dialog stays mounted.
  const [selected, setSelected] = useState<WorkflowTaskAction | null>(null);
  const canChooseAction =
    task.taskStatus !== "COMPLETED" &&
    (task.actions.length > 0 ||
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
          actions={task.actions}
          eligibilityActionRef={eligibilityActionRef}
          additionalItems={additionalItems}
          disabled={Boolean(selected)}
          onSelect={(key) => {
            const action = task.actions.find(
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
