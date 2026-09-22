import { z } from "zod";

import { workflowActionTypes } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";

const stableKeyPattern = /^[A-Z][A-Z0-9_]*$/;

function isStableKeyList(value: string) {
  const values = value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
  return values.length > 0 &&
    new Set(values).size === values.length &&
    values.every((item) => stableKeyPattern.test(item));
}

function reminderOffsets(value: string) {
  if (!value.trim()) return [];
  return value.split(/[\n,]/).map((item) => Number(item.trim()));
}

function requiredFor(
  value: string | number | undefined,
  message: string,
  path: string,
  context: z.RefinementCtx,
) {
  if (value === undefined || value === "") {
    context.addIssue({ code: "custom", message, path: [path] });
  }
}

export const workflowActionFormSchema = z
  .object({
    stableKey: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .regex(
        stableKeyPattern,
        "Use uppercase letters, numbers and underscores.",
      ),
    label: z.string().trim().min(2).max(160),
    actionType: z.enum(workflowActionTypes),
    enabled: z.boolean(),
    reasonCodeRequired: z.boolean(),
    displayOrder: z.number().int().positive(),
    reasonCodes: z.string(),
    rejectionCommentRequired: z.boolean(),
    rejectionOutcomeType: z.enum(["TERMINAL", "TRANSITION"]),
    cancelOpenStageInstances: z.boolean(),
    cancelOpenTasks: z.boolean(),
    rejectionPublicStatus: z.enum([
      "SUBMITTED",
      "UNDER_REVIEW",
      "ACTION_REQUIRED",
      "OUTCOME_AVAILABLE",
      "CLOSED",
      "WITHDRAWN",
    ]),
    rejectionPublicLabel: z.string().trim().max(120),
    rejectionPublicDescription: z.string().trim().max(300),
    reversibleActionKey: z.string(),
    deadlineDays: z.number().int().positive().max(365).optional(),
    editableFieldKeys: z.string(),
    reminderDayOffsets: z.string(),
    expiryAction: z.enum(["CLOSE_REQUEST", "ESCALATE", "RETURN"]),
    dataHandling: z.enum(["RETAIN", "CLEAR"]),
    reasonRequired: z.boolean(),
    returnToReferrer: z.boolean(),
    escalationTargetType: z.enum(["ROLE", "USER"]),
    escalationTargetId: z.string(),
    escalationTrigger: z.enum(["MANUAL", "SLA_BREACH", "CONDITION"]),
    reviewDateRequired: z.boolean(),
    allowedStageKeys: z.string(),
    resubmissionRule: z.enum([
      "NOT_ALLOWED",
      "NEW_APPLICATION",
      "REOPEN_WITHDRAWN",
    ]),
    deferTargetType: z.enum(["DATE", "FUNDING_CALL"]),
    targetDate: z.string(),
    targetCallKey: z
      .string()
      .refine((value) => !value || stableKeyPattern.test(value)),
  })
  .superRefine((values, context) => {
    if (values.actionType === "REJECT") {
      requiredFor(
        values.reasonCodes,
        "Enter reason codes.",
        "reasonCodes",
        context,
      );
      if (values.rejectionOutcomeType === "TERMINAL") {
        requiredFor(
          values.rejectionPublicLabel,
          "Enter a safe applicant-facing label.",
          "rejectionPublicLabel",
          context,
        );
        requiredFor(
          values.rejectionPublicDescription,
          "Enter a safe applicant-facing description.",
          "rejectionPublicDescription",
          context,
        );
      }
      if (values.reversibleActionKey
        && !stableKeyPattern.test(values.reversibleActionKey)) {
        context.addIssue({
          code: "custom",
          message: "Use an uppercase stable action key.",
          path: ["reversibleActionKey"],
        });
      }
    }
    if (values.actionType === "REQUEST_INFORMATION") {
      requiredFor(
        values.deadlineDays,
        "Enter a deadline.",
        "deadlineDays",
        context,
      );
      const offsets = reminderOffsets(values.reminderDayOffsets);
      if (
        offsets.some((offset) => !Number.isInteger(offset) || offset <= 0) ||
        new Set(offsets).size !== offsets.length
      ) {
        context.addIssue({
          code: "custom",
          message: "Use unique positive whole days separated by commas.",
          path: ["reminderDayOffsets"],
        });
      }
      if (
        values.deadlineDays &&
        offsets.some((offset) => offset >= values.deadlineDays!)
      ) {
        context.addIssue({
          code: "custom",
          message: "Reminder days must fall before the deadline.",
          path: ["reminderDayOffsets"],
        });
      }
      requiredFor(
        values.editableFieldKeys,
        "Enter editable field keys.",
        "editableFieldKeys",
        context,
      );
    }
    if (values.actionType === "ESCALATE") {
      requiredFor(
        values.escalationTargetId,
        "Select an escalation target.",
        "escalationTargetId",
        context,
      );
    }
    if (values.actionType === "PUT_ON_HOLD") {
      requiredFor(
        values.reasonCodes,
        "Enter reason codes.",
        "reasonCodes",
        context,
      );
    }
    if (values.actionType === "WITHDRAW") {
      requiredFor(
        values.allowedStageKeys,
        "Enter allowed stage keys.",
        "allowedStageKeys",
        context,
      );
    }
    if (values.actionType === "DEFER") {
      requiredFor(
        values.deferTargetType === "DATE"
          ? values.targetDate
          : values.targetCallKey,
        values.deferTargetType === "DATE"
          ? "Select a target date."
          : "Enter a target funding call key.",
        values.deferTargetType === "DATE" ? "targetDate" : "targetCallKey",
        context,
      );
    }
    const keyLists = [
      ["reasonCodes", values.reasonCodes],
      ["editableFieldKeys", values.editableFieldKeys],
      ["allowedStageKeys", values.allowedStageKeys],
    ] as const;
    keyLists.forEach(([path, value]) => {
      if (value && !isStableKeyList(value)) {
        context.addIssue({
          code: "custom",
          message: "Use uppercase keys separated by commas or new lines.",
          path: [path],
        });
      }
    });
  });

export type WorkflowActionFormValues = z.infer<
  typeof workflowActionFormSchema
>;

export const workflowActionTypeItems = [
  { label: "Approve / Advance", value: "APPROVE_ADVANCE" },
  { label: "Reject", value: "REJECT" },
  { label: "Request Information", value: "REQUEST_INFORMATION" },
  { label: "Return", value: "RETURN" },
  { label: "Refer", value: "REFER" },
  { label: "Escalate", value: "ESCALATE" },
  { label: "Put on Hold", value: "PUT_ON_HOLD" },
  { label: "Withdraw", value: "WITHDRAW" },
  { label: "Defer", value: "DEFER" },
] as const;
