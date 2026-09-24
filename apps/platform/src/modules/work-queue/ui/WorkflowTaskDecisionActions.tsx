"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { GeneralButton } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/form-field";
import { FormInput, FormSelect, FormTextarea } from "@/components/ui/form-fields";
import type { TaskDetail, WorkflowTaskAction } from "@/modules/work-queue/TaskTypes";
import { useExecuteWorkflowTaskAction } from "@/modules/work-queue/WorkQueueHooks";
import { WorkflowTaskActions } from "@/modules/work-queue/ui/WorkflowTaskActions";
import type { WorkflowActionInput } from "@/modules/workflows/domain/actions/WorkflowActionExecution";

function actionFormSchema(action: WorkflowTaskAction) {
  return z.object({
    comment: z.string().trim().max(4_000),
    confirmed: z.boolean(),
    instructions: z.string().trim().max(4_000),
    question: z.string().trim().max(4_000),
    reasonCode: z.string().trim().max(80),
    reviewDate: z.union([z.iso.date(), z.literal("")]),
  }).superRefine((values, context) => {
    if (action.requiredInput.reasonCode.required && !values.reasonCode) {
      context.addIssue({ code: "custom", message: "Select a reason.", path: ["reasonCode"] });
    }
    if (action.requiredInput.comment.required && !values.comment) {
      context.addIssue({ code: "custom", message: "Enter a comment.", path: ["comment"] });
    }
    if (action.requiredInput.reasonOrCommentRequired
      && !values.reasonCode && !values.comment) {
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
    if (action.actionType === "REQUEST_INFORMATION" && !values.instructions) {
      context.addIssue({
        code: "custom",
        message: "Enter instructions for the applicant.",
        path: ["instructions"],
      });
    }
    if (action.actionType === "REFER" && !values.question) {
      context.addIssue({ code: "custom", message: "Enter a question.", path: ["question"] });
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
    case "REQUEST_INFORMATION":
      return {
        ...common,
        actionType: "REQUEST_INFORMATION",
        editableFieldKeys: [...action.requiredInput.editableFieldKeys],
        instructions: values.instructions,
        requestedDocumentCategories: [],
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
        targetType: action.requiredInput.target.type === "DATE"
          ? "DATE" : "FUNDING_CALL",
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
  onCancel,
  task,
}: {
  action: WorkflowTaskAction;
  onCancel: () => void;
  task: TaskDetail;
}) {
  const router = useRouter();
  const execution = useExecuteWorkflowTaskAction(task.taskInstanceId);
  const form = useForm<ActionValues>({
    defaultValues: {
      comment: "",
      confirmed: false,
      instructions: "",
      question: "",
      reasonCode: "",
      reviewDate: "",
    },
    resolver: zodResolver(actionFormSchema(action)),
  });
  const submit = form.handleSubmit(async (values) => {
    try {
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
      toast.success(result.transition.targetStageName
        ? `Application advanced to ${result.transition.targetStageName}.`
        : `${action.label} recorded.`);
      router.push("/admin/work-queue");
    } catch {
      // The mutation error is displayed below the form.
    }
  });
  return (
    <FormProvider {...form}>
      <form className="space-y-4 rounded-xl border border-brand-navy/15 p-4" onSubmit={submit}>
        <h3 className="font-semibold text-brand-navy">{action.label}</h3>
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
          <FormTextarea label="Applicant instructions" name="instructions" required />
        ) : null}
        {action.actionType === "REFER" ? (
          <FormTextarea label="Question for the reviewer" name="question" required />
        ) : null}
        {action.requiredInput.reviewDate.required ? (
          <FormInput label="Review date" name="reviewDate" required type="date" />
        ) : null}
        {action.actionType === "REJECT"
          || action.requiredInput.comment.required
          || action.requiredInput.reasonOrCommentRequired ? (
          <FormTextarea
            label="Comment"
            name="comment"
            required={action.requiredInput.comment.required}
          />
        ) : null}
        {action.requiredInput.confirmation.required ? (
          <CheckboxField
            label={action.requiredInput.confirmation.message ?? "Confirm this action"}
            name="confirmed"
          />
        ) : null}
        {execution.isError ? (
          <p className="text-sm text-red-700" role="alert">{execution.error.message}</p>
        ) : null}
        <div className="flex justify-end gap-3">
          <GeneralButton onClick={onCancel} type="button" variant="outline">
            Cancel
          </GeneralButton>
          <GeneralButton disabled={execution.isPending} type="submit" variant={action.presentation.variant}>
            {execution.isPending ? "Submitting…" : `Confirm ${action.label}`}
          </GeneralButton>
        </div>
      </form>
    </FormProvider>
  );
}

export function WorkflowTaskDecisionActions({ task }: { task: TaskDetail }) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  if (task.taskStatus === "COMPLETED" || !task.actions.length) return null;
  const selected = task.actions.find((action) => action.key === selectedKey);
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
          key={selected.key}
          onCancel={() => setSelectedKey(null)}
          task={task}
        />
      ) : null}
    </div>
  );
}
