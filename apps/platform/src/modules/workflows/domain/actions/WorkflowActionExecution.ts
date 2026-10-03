import { z } from "zod";

import { richTextToPlainText } from "@/shared/utils/RichText";

import type { WorkflowActionDefinition } from "./WorkflowActionDefinition";

const commentSchema = z.string().trim().min(1).max(4_000).optional();
const reasonSchema = z.string().trim().min(1).max(4_000).optional();
const fieldKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[A-Za-z][A-Za-z0-9_.]*$/);
const commonInput = {
  comment: commentSchema,
  reason: reasonSchema,
};

export const workflowActionInputSchema = z
  .discriminatedUnion("actionType", [
    z
      .object({
        ...commonInput,
        actionType: z.literal("APPROVE_ADVANCE"),
      })
      .strict(),
    z
      .object({
        ...commonInput,
        actionType: z.literal("REJECT"),
      })
      .strict(),
    z
      .object({
        ...commonInput,
        actionType: z.literal("REQUEST_INFORMATION"),
        editableFieldPaths: z
          .array(fieldKeySchema)
          .max(100)
          .refine(
            (paths) => new Set(paths).size === paths.length,
            "Editable fields must be unique.",
          ),
        instructions: z
          .string()
          .trim()
          .min(1)
          .max(12_000)
          .refine((value) => richTextToPlainText(value).length > 0, {
            message: "Enter instructions for the applicant.",
          }),
        requestedDocumentRequirementIds: z
          .array(z.uuid())
          .max(100)
          .refine(
            (values) => new Set(values).size === values.length,
            "Requested document requirements must be unique.",
          )
          .default([]),
      })
      .strict(),
    z
      .object({
        ...commonInput,
        actionType: z.literal("RETURN"),
      })
      .strict(),
    z
      .object({
        ...commonInput,
        actionType: z.literal("REFER"),
        question: z.string().trim().min(1).max(4_000),
      })
      .strict(),
    z
      .object({
        ...commonInput,
        actionType: z.literal("ESCALATE"),
      })
      .strict(),
    z
      .object({
        ...commonInput,
        actionType: z.literal("PUT_ON_HOLD"),
        reviewDate: z.iso.date().optional(),
      })
      .strict(),
    z
      .object({
        ...commonInput,
        actionType: z.literal("RESUME"),
      })
      .strict(),
    z
      .object({
        ...commonInput,
        actionType: z.literal("WITHDRAW"),
        confirmed: z.literal(true),
      })
      .strict(),
    z
      .object({
        ...commonInput,
        actionType: z.literal("DEFER"),
        targetType: z.enum(["DATE", "FUNDING_CALL"]),
        targetDate: z.iso.date().optional(),
        targetCallKey: z.string().trim().min(2).max(80).optional(),
      })
      .strict()
      .superRefine((input, context) => {
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
  ])
  .superRefine((input, context) => {
    if (
      input.actionType === "REQUEST_INFORMATION" &&
      input.editableFieldPaths.length === 0 &&
      input.requestedDocumentRequirementIds.length === 0
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Request detailed information, at least one document, or both.",
        path: ["editableFieldPaths"],
      });
    }
  });

export const workflowActionExecutionRequestSchema = z
  .object({
    expectedRuntimeVersion: z.number().int().positive(),
    input: workflowActionInputSchema,
    sourceStageInstanceId: z.uuid(),
    taskId: z.uuid().optional(),
  })
  .strict();

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
  requestInformationId: string | null;
  sourceStageInstanceId: string;
  taskId: string | null;
  transition: {
    kind:
      | "NONE"
      | "STAGE_ACTIVE"
      | "STAGE_BLOCKED"
      | "STAGE_ACTIVATED"
      | "JOIN_PENDING"
      | "WORKFLOW_COMPLETED"
      | "WORKFLOW_REJECTED"
      | "WORKFLOW_WITHDRAWN";
    targets: Array<{
      outcome:
        | "ACTIVATED"
        | "ALREADY_ACTIVE"
        | "ENTRY_CONDITION_FAILED"
        | "JOIN_PENDING";
      targetStageInstanceId: string | null;
      targetStageName: string;
    }>;
    workflowStatus: "ACTIVE" | "COMPLETED" | "REJECTED" | "CANCELLED";
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
  if (action.reasonRequired && !input.reason?.trim()) {
    return "A reason is required for this action.";
  }
  switch (action.actionType) {
    case "REQUEST_INFORMATION":
      if (input.actionType !== "REQUEST_INFORMATION") return null;
      if (
        input.editableFieldPaths.some(
          (path) => !action.configuration.editableFieldPaths.includes(path),
        )
      ) {
        return "The request contains an editable field that is not configured.";
      }
      return null;
    case "ESCALATE":
      return action.configuration.trigger === "MANUAL" ||
        action.configuration.trigger === "CONDITION"
        ? null
        : "This escalation is not available for manual execution.";
    case "PUT_ON_HOLD":
      return action.configuration.reviewDateRequired &&
        input.actionType === "PUT_ON_HOLD" &&
        !input.reviewDate
        ? "A review date is required for this hold."
        : null;
    case "RESUME":
      return null;
    case "WITHDRAW":
      return action.configuration.allowedStageKeys.includes(sourceStageKey)
        ? null
        : "Withdrawal is not configured for this stage.";
    case "DEFER":
      if (
        input.actionType !== "DEFER" ||
        input.targetType !== action.configuration.targetType
      ) {
        return "The deferral target type does not match the configuration.";
      }
      if (
        input.targetType === "DATE" &&
        action.configuration.targetType === "DATE"
      ) {
        return input.targetDate === action.configuration.targetDate
          ? null
          : "The deferral date does not match the configured target.";
      }
      if (
        input.targetType === "FUNDING_CALL" &&
        action.configuration.targetType === "FUNDING_CALL"
      ) {
        return input.targetCallKey === action.configuration.targetCallKey
          ? null
          : "The deferral funding call does not match the configured target.";
      }
      return "The deferral target type does not match the configuration.";
    default:
      return null;
  }
}
