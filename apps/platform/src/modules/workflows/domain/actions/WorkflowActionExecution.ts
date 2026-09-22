import { z } from "zod";

import type { WorkflowActionDefinition } from "./WorkflowActionDefinition";

const commentSchema = z.string().trim().min(1).max(4_000).optional();
const reasonCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[A-Z][A-Z0-9_]*$/)
  .optional();
const fieldKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[A-Za-z][A-Za-z0-9_.]*$/);
const commonInput = {
  comment: commentSchema,
  reasonCode: reasonCodeSchema,
};

export const workflowActionInputSchema = z.discriminatedUnion("actionType", [
  z.object({
    ...commonInput,
    actionType: z.literal("APPROVE_ADVANCE"),
  }).strict(),
  z.object({
    ...commonInput,
    actionType: z.literal("REJECT"),
  }).strict(),
  z.object({
    ...commonInput,
    actionType: z.literal("REQUEST_INFORMATION"),
    editableFieldKeys: z.array(fieldKeySchema).max(100),
    instructions: z.string().trim().min(1).max(4_000),
    requestedDocumentCategories: z.array(fieldKeySchema).max(100).default([]),
  }).strict(),
  z.object({
    ...commonInput,
    actionType: z.literal("RETURN"),
  }).strict(),
  z.object({
    ...commonInput,
    actionType: z.literal("REFER"),
    question: z.string().trim().min(1).max(4_000),
  }).strict(),
  z.object({
    ...commonInput,
    actionType: z.literal("ESCALATE"),
  }).strict(),
  z.object({
    ...commonInput,
    actionType: z.literal("PUT_ON_HOLD"),
    reviewDate: z.iso.date().optional(),
  }).strict(),
  z.object({
    ...commonInput,
    actionType: z.literal("WITHDRAW"),
    confirmed: z.literal(true),
  }).strict(),
  z.object({
    ...commonInput,
    actionType: z.literal("DEFER"),
    targetType: z.enum(["DATE", "FUNDING_CALL"]),
    targetDate: z.iso.date().optional(),
    targetCallKey: z.string().trim().min(2).max(80).optional(),
  }).strict().superRefine((input, context) => {
    if (input.targetType === "DATE" && !input.targetDate) {
      context.addIssue({
        code: "custom",
        message: "A target date is required.",
        path: ["targetDate"],
      });
    }
    if (input.targetType === "FUNDING_CALL" && !input.targetCallKey) {
      context.addIssue({
        code: "custom",
        message: "A target funding call is required.",
        path: ["targetCallKey"],
      });
    }
  }),
]);

export const workflowActionExecutionRequestSchema = z.object({
  expectedRuntimeVersion: z.number().int().positive(),
  input: workflowActionInputSchema,
  sourceStageInstanceId: z.uuid(),
  taskId: z.uuid().optional(),
}).strict();

export type WorkflowActionInput = z.infer<typeof workflowActionInputSchema>;
export type WorkflowActionExecutionRequest = z.infer<
  typeof workflowActionExecutionRequestSchema
>;

export type WorkflowActionExecutionResult = {
  actionExecutionId: string;
  actionKey: string;
  actionType: WorkflowActionInput["actionType"];
  decisionId: string | null;
  executedAt: string;
  resultingRuntimeVersion: number;
  sourceStageInstanceId: string;
  taskId: string | null;
  transition: {
    kind: "NONE" | "STAGE_ACTIVE" | "STAGE_ACTIVATED" | "WORKFLOW_COMPLETED";
    targetStageInstanceId: string | null;
    targetStageName: string | null;
    workflowStatus: "ACTIVE" | "COMPLETED";
  };
  workflowInstanceId: string;
};

export const workflowActionExecutionErrorCodes = [
  "ACTION_NOT_CONFIGURED",
  "ACTION_UNAVAILABLE",
  "ACTION_TYPE_MISMATCH",
  "CONDITION_FAILED",
  "INVALID_ACTION_INPUT",
  "INVALID_RUNTIME_CONTEXT",
  "STALE_RUNTIME_VERSION",
] as const;

export type WorkflowActionExecutionErrorCode =
  (typeof workflowActionExecutionErrorCodes)[number];

export class WorkflowActionExecutionError extends Error {
  readonly code: WorkflowActionExecutionErrorCode;
  readonly userMessage: string;

  constructor(code: WorkflowActionExecutionErrorCode, message: string) {
    super(message);
    this.name = "WorkflowActionExecutionError";
    this.code = code;
    this.userMessage = message;
  }
}

export function validateActionInputAgainstConfiguration(
  action: WorkflowActionDefinition,
  input: WorkflowActionInput,
  sourceStageKey: string,
): string | null {
  if (action.actionType !== input.actionType) {
    return "The action payload type does not match the configured action.";
  }
  if (action.reasonCodeRequired && !input.reasonCode) {
    return "A reason code is required for this action.";
  }
  switch (action.actionType) {
    case "REJECT":
      return input.reasonCode
          && !action.configuration.reasonCodes.includes(input.reasonCode)
        ? "The rejection reason is not configured for this action."
        : null;
    case "REQUEST_INFORMATION":
      return input.actionType === "REQUEST_INFORMATION"
          && input.editableFieldKeys.some(
            (key) => !action.configuration.editableFieldKeys.includes(key),
          )
        ? "The request contains an editable field that is not configured."
        : null;
    case "RETURN":
      return action.configuration.reasonRequired
          && !input.reasonCode
          && !input.comment
        ? "A return reason or comment is required."
        : null;
    case "ESCALATE":
      return action.configuration.trigger === "MANUAL"
        || action.configuration.trigger === "CONDITION"
        ? null
        : "This escalation is not available for manual execution.";
    case "PUT_ON_HOLD":
      if (input.reasonCode
        && !action.configuration.reasonCodes.includes(input.reasonCode)) {
        return "The hold reason is not configured for this action.";
      }
      return action.configuration.reviewDateRequired
          && input.actionType === "PUT_ON_HOLD"
          && !input.reviewDate
        ? "A review date is required for this hold."
        : null;
    case "WITHDRAW":
      return action.configuration.allowedStageKeys.includes(sourceStageKey)
        ? null
        : "Withdrawal is not configured for this stage.";
    case "DEFER":
      if (input.actionType !== "DEFER"
        || input.targetType !== action.configuration.targetType) {
        return "The deferral target type does not match the configuration.";
      }
      if (input.targetType === "DATE"
        && action.configuration.targetType === "DATE") {
        return input.targetDate === action.configuration.targetDate
          ? null
          : "The deferral date does not match the configured target.";
      }
      if (input.targetType === "FUNDING_CALL"
        && action.configuration.targetType === "FUNDING_CALL") {
        return input.targetCallKey === action.configuration.targetCallKey
          ? null
          : "The deferral funding call does not match the configured target.";
      }
      return "The deferral target type does not match the configuration.";
    default:
      return null;
  }
}
