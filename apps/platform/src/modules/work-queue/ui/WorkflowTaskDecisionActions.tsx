"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { FormRichTextField } from "@/shared/ui/FormRichTextField";
import { richTextToPlainText } from "@/shared/utils/RichText";
import type {
  TaskDetail,
  WorkflowTaskAction,
} from "@/modules/work-queue/TaskTypes";
import { useExecuteWorkflowTaskAction } from "@/modules/work-queue/WorkQueueHooks";
import { WorkflowTaskActions } from "@/modules/work-queue/ui/WorkflowTaskActions";
import { isWorkflowStageDecisionAction } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
import type { WorkflowActionInput } from "@/modules/workflows/domain/actions/WorkflowActionExecution";

function actionFormSchema(action: WorkflowTaskAction) {
  return z
    .object({
      comment: z.string().trim().max(4_000),
      confirmed: z.boolean(),
      instructions: z.string().trim().max(12_000),
      requestDetailedInformation: z.boolean(),
      question: z.string().trim().max(4_000),
      reasonCode: z.string().trim().max(80),
      requestedDocumentRequirementIds: z.array(z.uuid()).max(100),
      reviewDate: z.union([z.iso.date(), z.literal("")]),
    })
    .superRefine((values, context) => {
      if (action.requiredInput.reasonCode.required && !values.reasonCode) {
        context.addIssue({
          code: "custom",
          message: "Select a reason.",
          path: ["reasonCode"],
        });
      }
      if (action.requiredInput.comment.required && !values.comment) {
        context.addIssue({
          code: "custom",
          message: "Enter a comment.",
          path: ["comment"],
        });
      }
      if (
        action.requiredInput.reasonOrCommentRequired &&
        !values.reasonCode &&
        !values.comment
      ) {
        context.addIssue({
          code: "custom",
          message: "Enter a reason or comment.",
          path: ["comment"],
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
          message: "Request detailed information, at least one document, or both.",
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
    ...(values.comment ? { comment: values.comment } : {}),
    ...(values.reasonCode ? { reasonCode: values.reasonCode } : {}),
  };
  switch (action.actionType) {
    case "REJECT":
      return { actionType: "REJECT", comment: values.comment };
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
  task,
}: {
  action: WorkflowTaskAction;
  beforeAction?: () => Promise<void>;
  onCancel: () => void;
  task: TaskDetail;
}) {
  const router = useRouter();
  const execution = useExecuteWorkflowTaskAction(task.taskInstanceId);
  const [isFinalizingForm, setIsFinalizingForm] = useState(false);
  const form = useForm<ActionValues>({
    defaultValues: {
      comment: "",
      confirmed: false,
      instructions: "",
      requestDetailedInformation: false,
      question: "",
      reasonCode: "",
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
        setIsFinalizingForm(true);
        await beforeAction();
        setIsFinalizingForm(false);
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
      router.push("/admin/work-queue");
    } catch (error) {
      setIsFinalizingForm(false);
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
        isLoading={isFinalizingForm || execution.isPending}
        isOpen
        loadingText="Submitting…"
        message={
          <div className="space-y-4">
            <p>Confirm {action.label.toLowerCase()}?</p>
            {action.requiredInput.reasonCode.options.length ? (
              <FormSelect
                items={action.requiredInput.reasonCode.options.map((code) => ({
                  label: code.replaceAll("_", " "),
                  value: code,
                }))}
                label="Reason"
                name="reasonCode"
                placeholder="Select a reason"
                required={action.requiredInput.reasonCode.required}
              />
            ) : action.requiredInput.reasonCode.required ? (
              <FormInput label="Reason code" name="reasonCode" required />
            ) : null}
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
            {action.actionType === "REJECT" ||
            action.requiredInput.comment.required ||
            action.requiredInput.reasonOrCommentRequired ? (
              <FormTextarea
                label={action.actionType === "REJECT" ? "Reason" : "Comment"}
                name="comment"
                required={
                  action.actionType === "REJECT" ||
                  action.requiredInput.comment.required
                }
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
        onCancel={onCancel}
        onConfirm={() => void submit()}
        title={action.label}
      />
    </FormProvider>
  );
}

export function WorkflowTaskDecisionActions({
  beforeAction,
  task,
}: {
  beforeAction?: () => Promise<void>;
  task: TaskDetail;
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  if (task.taskStatus === "COMPLETED" || !task.actions.length) return null;
  const selected = task.actions.find((action) => action.key === selectedKey);
  const actionFinalizer = selected && isWorkflowStageDecisionAction(
    selected.actionType,
  )
    ? beforeAction
    : undefined;
  return (
    <div className="space-y-4">
      <WorkflowTaskActions
        actions={task.actions}
        buttonType="button"
        disabled={false}
        onSelect={setSelectedKey}
      />
      {selected?.available ? (
        <DecisionForm
          action={selected}
          beforeAction={actionFinalizer}
          key={selected.key}
          onCancel={() => setSelectedKey(null)}
          task={task}
        />
      ) : null}
    </div>
  );
}
