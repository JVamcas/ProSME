import { z } from "zod";
import type { WorkflowTaskAction } from "@/modules/work-queue/TaskTypes";
import type { WorkflowActionInput } from "../../domain/actions/WorkflowActionExecution";
import { workflowRfiDetailedResponseFieldPath } from "../../domain/runtime/WorkflowRfi";
import { richTextToPlainText } from "@/shared/utils/RichText";

export function actionFormSchema(action: WorkflowTaskAction) {
  return z
    .object({
      confirmed: z.boolean(),
      instructions: z.string().trim().max(12_000),
      requestDetailedInformation: z.boolean(),
      editableFieldPaths: z.array(z.string().min(1)).max(100),
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
          action.requiredInput.editableFieldPaths.includes(
            workflowRfiDetailedResponseFieldPath,
          )
        ) &&
        values.editableFieldPaths.length === 0 &&
        values.requestedDocumentRequirementIds.length === 0
      ) {
        context.addIssue({
          code: "custom",
          message:
            "Select application fields, request a written clarification, or request documents.",
          path: ["editableFieldPaths"],
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

export type ActionValues = z.infer<ReturnType<typeof actionFormSchema>>;

export function actionInput(
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
        editableFieldPaths: [
          ...values.editableFieldPaths,
          ...(values.requestDetailedInformation
            ? [workflowRfiDetailedResponseFieldPath]
            : []),
        ],
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
