"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, type Ref } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { CheckboxField } from "@/components/ui/form-field";
import {
  FormInput,
  FormSelect,
  FormTextarea,
} from "@/components/ui/form-fields";
import type { DropdownButtonItem } from "@/shared/ui/DropdownButton";
import { FormRichTextField } from "@/shared/ui/FormRichTextField";
import { richTextToPlainText } from "@/shared/utils/RichText";
import type {
  TaskDetail,
  WorkflowTaskAction,
} from "@/modules/work-queue/TaskTypes";
import { useExecuteWorkflowTaskAction } from "@/modules/work-queue/WorkQueueHooks";
import { WorkflowTaskActions } from "@/modules/workflows/ui/tasks/WorkflowTaskActions";
import { isWorkflowStageDecisionAction } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
import type { WorkflowActionInput } from "@/modules/workflows/domain/actions/WorkflowActionExecution";

function actionFormSchema(action: WorkflowTaskAction) {
  return z
    .object({
      confirmed: z.boolean(),
      instructions: z.string().trim().max(12_000),
      requestDetailedInformation: z.boolean(),
      question: z.string().trim().max(4_000),
      reason: z.string().trim().max(action.requiredInput.reason.maxLength),
      requestedDocumentRequirementIds: z.array(z.uuid()).max(100),
      reviewDate: z.union([z.iso.date(), z.literal("")]),
    })
    .superRefine((values, context) => {
      if (action.requiredInput.reason.required && !values.reason) {
        context.addIssue({
          code: "custom",
          message: "Enter a reason.",
          path: ["reason"],
        });
      }
      if (action.requiredInput.confirmation.required && !values.confirmed) {
        context.addIssue({
          code: "custom",
          message: "Confirm this decision.",
          path: ["confirmed"],
        });
      }
      if (
        action.actionType === "REQUEST_INFORMATION" &&
        !richTextToPlainText(values.instructions)
      ) {
        context.addIssue({
          code: "custom",
          message: "Enter instructions for the applicant.",
          path: ["instructions"],
        });
      }
      if (
        action.actionType === "REQUEST_INFORMATION" &&
        !(
          values.requestDetailedInformation &&
          action.requiredInput.editableFieldPaths.length > 0
        ) &&
        values.requestedDocumentRequirementIds.length === 0
      ) {
        context.addIssue({
          code: "custom",
          message:
            "Request detailed information, at least one document, or both.",
          path: ["requestDetailedInformation"],
        });
      }
      if (action.actionType === "REFER" && !values.question) {
        context.addIssue({
          code: "custom",
          message: "Enter a question.",
          path: ["question"],
        });
      }
      if (action.requiredInput.reviewDate.required && !values.reviewDate) {
        context.addIssue({
          code: "custom",
          message: "Select a review date.",
          path: ["reviewDate"],
        });
      }
    });
}

type ActionValues = z.infer<ReturnType<typeof actionFormSchema>>;

function actionInput(
  action: WorkflowTaskAction,
  values: ActionValues,
): WorkflowActionInput {
  const common = {
    ...(values.reason ? { reason: values.reason } : {}),
  };
  switch (action.actionType) {
    case "REJECT":
      return { ...common, actionType: "REJECT" };
    case "REQUEST_INFORMATION":
      return {
        ...common,
        actionType: "REQUEST_INFORMATION",
        editableFieldPaths: values.requestDetailedInformation
          ? [...action.requiredInput.editableFieldPaths]
          : [],
        instructions: values.instructions,
        requestedDocumentRequirementIds: values.requestedDocumentRequirementIds,
      };
    case "REFER":
      return { ...common, actionType: "REFER", question: values.question };
    case "PUT_ON_HOLD":
      return {
        ...common,
        actionType: "PUT_ON_HOLD",
        ...(values.reviewDate ? { reviewDate: values.reviewDate } : {}),
      };
    case "WITHDRAW":
      return { ...common, actionType: "WITHDRAW", confirmed: true };
    case "DEFER":
      return {
        ...common,
        actionType: "DEFER",
        targetType:
          action.requiredInput.target.type === "DATE" ? "DATE" : "FUNDING_CALL",
        ...(action.requiredInput.target.type === "DATE"
          ? { targetDate: action.requiredInput.target.value ?? undefined }
          : { targetCallKey: action.requiredInput.target.value ?? undefined }),
      };
    default:
      return { ...common, actionType: action.actionType };
  }
}

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
      question: "",
      reason: "",
      requestedDocumentRequirementIds: [],
      reviewDate: "",
    },
    resolver: zodResolver(actionFormSchema(action)),
  });
  const requestedDocumentRequirementIds = useWatch({
    control: form.control,
    name: "requestedDocumentRequirementIds",
  });
  const missingApplicantDocuments =
    action.actionType === "REQUEST_INFORMATION"
      ? task.documentRequirements.filter(
          (requirement) =>
            requirement.id &&
            requirement.uploader === "APPLICANT" &&
            requirement.requestStatus === "MISSING",
        )
      : [];
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
              <>
                <FormRichTextField
                  label="Instructions for applicant"
                  name="instructions"
                  placeholder="Explain what information or documents the applicant should provide."
                  required
                />
                {action.requiredInput.editableFieldPaths.length ? (
                  <CheckboxField
                    description="The applicant will see a rich-text field for a detailed written response."
                    label="Request detailed information"
                    name="requestDetailedInformation"
                  />
                ) : null}
                {missingApplicantDocuments.length ? (
                  <FormSelect
                    items={missingApplicantDocuments.map((requirement) => ({
                      label: requirement.name,
                      value: requirement.id!,
                    }))}
                    label="Missing applicant documents"
                    multiple
                    name="requestedDocumentRequirementIds"
                    onMultipleChange={(values) => {
                      form.setValue("requestedDocumentRequirementIds", values, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }}
                    value={requestedDocumentRequirementIds}
                  />
                ) : null}
              </>
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
