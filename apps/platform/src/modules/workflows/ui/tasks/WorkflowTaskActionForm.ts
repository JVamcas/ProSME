import { z } from "zod";
import {
  parseWorkflowRfiReminderOffsets,
  resolveWorkflowRfiDeadline,
  workflowRfiDeadlineFields,
} from "../../domain/actions/WorkflowRequestInformationDeadline";
import { workflowHoldScopes } from "../../domain/runtime/WorkflowHold";
import type { WorkflowTaskAction } from "@/modules/work-queue/TaskTypes";
import type { WorkflowActionInput } from "../../domain/actions/WorkflowActionExecution";
import { workflowRfiDetailedResponseFieldPath } from "../../domain/runtime/WorkflowRfi";
import { richTextToPlainText } from "@/shared/utils/RichText";

export function actionFormSchema(action: WorkflowTaskAction) {
  return z
    .object({
      confirmed: z.boolean(),
      deadlineDays: workflowRfiDeadlineFields.deadlineDays.optional(),
      expiryAction: workflowRfiDeadlineFields.expiryAction.optional(),
      reminderDayOffsets: z.string().optional(),
      holdScope: z
        .union([z.enum(workflowHoldScopes), z.literal("")])
        .optional(),
      holdId: z.union([z.uuid(), z.literal("")]).optional(),
      escalationTargetType: z.enum(["ROLE", "USER"]).optional(),
      escalationTargetId: z.union([z.uuid(), z.literal("")]).optional(),
      targetStageDefinitionId: z.union([z.uuid(), z.literal("")]).optional(),
      dataHandling: z.enum(["RETAIN", "CLEAR"]),
      sourceTaskBehavior: z.enum(["BLOCKED", "OPEN"]),
      returnToReferrer: z.boolean(),
      instructions: z.string().trim().max(12_000),
      requestDetailedInformation: z.boolean(),
      editableFieldPaths: z.array(z.string().min(1)).max(100),
      question: z.string().trim().max(4_000),
      reason: z.string().trim().max(action.requiredInput.reason.maxLength),
      requestedDocumentRequirementIds: z.array(z.uuid()).max(100),
      reviewDate: z.union([z.iso.datetime({ local: true }), z.literal("")]),
    })
    .superRefine((values, context) => {
      const deadlineConfiguration =
        action.requiredInput.requestInformationDeadline;
      if (
        action.actionType === "REQUEST_INFORMATION" &&
        deadlineConfiguration
      ) {
        const deadline = resolveWorkflowRfiDeadline(
          deadlineConfiguration,
          requestInformationDeadlineOverrides(action, values),
        );
        if (!deadline.success) {
          for (const issue of deadline.issues) {
            const field =
              issue.path[0] === "reminderDayOffsets" &&
              !deadlineConfiguration.runtimeOverrides?.reminderDayOffsets
                ? "deadlineDays"
                : (issue.path[0] ?? "deadlineDays");
            context.addIssue({
              code: "custom",
              message: issue.message,
              path: [field],
            });
          }
        }
        const overrides = deadlineConfiguration.runtimeOverrides;
        if (overrides?.deadlineDays && values.deadlineDays === undefined) {
          context.addIssue({
            code: "custom",
            message: "Enter a deadline.",
            path: ["deadlineDays"],
          });
        }
        if (
          overrides?.expiryAction &&
          values.expiryAction !== "CLOSE_REQUEST" &&
          values.expiryAction !== deadlineConfiguration.expiryAction
        ) {
          context.addIssue({
            code: "custom",
            message: "Choose a supported expiry action.",
            path: ["expiryAction"],
          });
        }
      }
      if (
        action.actionType === "PUT_ON_HOLD" &&
        !action.requiredInput.holdScopes?.some(
          (scope) => scope === values.holdScope,
        )
      ) {
        context.addIssue({
          code: "custom",
          message: "Choose an authorized hold scope.",
          path: ["holdScope"],
        });
      }
      if (
        action.actionType === "RESUME" &&
        action.requiredInput.resumableHolds?.length &&
        !action.requiredInput.resumableHolds.some(
          (hold) => hold.id === values.holdId,
        )
      ) {
        context.addIssue({
          code: "custom",
          message: "Choose a hold to resume.",
          path: ["holdId"],
        });
      }
      if (
        (action.actionType === "RETURN" || action.actionType === "REFER") &&
        !action.requiredInput.destinationStages?.some(
          (stage) => stage.id === values.targetStageDefinitionId,
        )
      ) {
        context.addIssue({
          code: "custom",
          message: "Choose a destination stage.",
          path: ["targetStageDefinitionId"],
        });
      }
      if (
        action.actionType === "ESCALATE" &&
        !action.requiredInput.escalationTargets?.some(
          (target) =>
            target.targetType === values.escalationTargetType &&
            target.id === values.escalationTargetId,
        )
      ) {
        context.addIssue({
          code: "custom",
          message: "Choose a destination user or role.",
          path: ["escalationTargetId"],
        });
      }
      if (
        action.actionType !== "REQUEST_INFORMATION" &&
        action.requiredInput.reason.required &&
        !values.reason
      ) {
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
          message: "Select a review date and time.",
          path: ["reviewDate"],
        });
      }
    });
}

export type ActionValues = z.infer<ReturnType<typeof actionFormSchema>>;

export function actionFormDefaults(action: WorkflowTaskAction): ActionValues {
  const defaultTarget = action.requiredInput.escalationTargets?.find(
    (target) =>
      target.targetType === action.requiredInput.target.type &&
      target.id === action.requiredInput.target.value,
  );
  return {
    confirmed: false,
    deadlineDays: action.requiredInput.requestInformationDeadline?.deadlineDays,
    expiryAction: action.requiredInput.requestInformationDeadline?.expiryAction,
    reminderDayOffsets:
      action.requiredInput.requestInformationDeadline?.reminderDayOffsets.join(
        ", ",
      ) ?? "",
    holdScope: action.requiredInput.holdScopes?.includes("TASK")
      ? "TASK"
      : (action.requiredInput.holdScopes?.[0] ?? ""),
    holdId:
      action.requiredInput.resumableHolds?.length === 1
        ? action.requiredInput.resumableHolds[0].id
        : "",
    escalationTargetType:
      action.requiredInput.target.type === "USER" ? "USER" : "ROLE",
    escalationTargetId: defaultTarget?.id ?? "",
    targetStageDefinitionId:
      action.requiredInput.defaultDestinationStageId ?? "",
    dataHandling:
      action.requiredInput.controlDefaults?.dataHandling ?? "RETAIN",
    sourceTaskBehavior:
      action.requiredInput.controlDefaults?.sourceTaskBehavior ?? "BLOCKED",
    returnToReferrer:
      action.requiredInput.controlDefaults?.returnToReferrer ?? true,
    instructions: "",
    requestDetailedInformation: false,
    editableFieldPaths: [],
    question: "",
    reason: "",
    requestedDocumentRequirementIds: [],
    reviewDate: "",
  };
}

export function actionInput(
  action: WorkflowTaskAction,
  values: ActionValues,
): WorkflowActionInput {
  const common = {
    ...(values.reason ? { reason: values.reason } : {}),
  };
  const deadlineOverrides = requestInformationDeadlineOverrides(action, values);
  switch (action.actionType) {
    case "REJECT":
      return { ...common, actionType: "REJECT" };
    case "REQUEST_INFORMATION":
      return {
        actionType: "REQUEST_INFORMATION",
        ...(Object.keys(deadlineOverrides).length ? { deadlineOverrides } : {}),
        editableFieldPaths: [
          ...values.editableFieldPaths,
          ...(values.requestDetailedInformation
            ? [workflowRfiDetailedResponseFieldPath]
            : []),
        ],
        instructions: values.instructions,
        requestedDocumentRequirementIds: values.requestedDocumentRequirementIds,
      };
    case "RETURN":
      return {
        ...common,
        actionType: "RETURN",
        targetStageDefinitionId: values.targetStageDefinitionId!,
        dataHandling: values.dataHandling,
      };
    case "REFER":
      return {
        ...common,
        actionType: "REFER",
        targetStageDefinitionId: values.targetStageDefinitionId!,
        question: values.question,
        sourceTaskBehavior: values.sourceTaskBehavior,
        returnToReferrer: values.returnToReferrer,
      };
    case "ESCALATE":
      return {
        ...common,
        actionType: "ESCALATE",
        targetType: values.escalationTargetType!,
        targetId: values.escalationTargetId!,
      };
    case "PUT_ON_HOLD":
      return {
        ...common,
        actionType: "PUT_ON_HOLD",
        scope: values.holdScope as (typeof workflowHoldScopes)[number],
        ...(values.reviewDate
          ? { reviewDate: new Date(values.reviewDate).toISOString() }
          : {}),
      };
    case "RESUME":
      return {
        ...common,
        actionType: "RESUME",
        ...(values.holdId ? { holdId: values.holdId } : {}),
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

export function requestInformationDeadlineOverrides(
  action: WorkflowTaskAction,
  values: {
    deadlineDays?: number;
    expiryAction?: "CLOSE_REQUEST" | "ESCALATE" | "RETURN";
    reminderDayOffsets?: string;
  },
) {
  const overrides =
    action.requiredInput.requestInformationDeadline?.runtimeOverrides;
  return {
    ...(overrides?.deadlineDays ? { deadlineDays: values.deadlineDays } : {}),
    ...(overrides?.expiryAction && values.expiryAction === "CLOSE_REQUEST"
      ? { expiryAction: values.expiryAction }
      : {}),
    ...(overrides?.reminderDayOffsets
      ? {
          reminderDayOffsets: parseWorkflowRfiReminderOffsets(
            values.reminderDayOffsets ?? "",
          ),
        }
      : {}),
  };
}
