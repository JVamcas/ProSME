import { z } from "zod";

import type { WorkflowTaskInput } from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { conditionFieldTypes } from "@/modules/conditions/domain/ConditionConfiguration";
import { staticPermissionCodes } from "@/auth/authorization/permissions";
import { workflowElementVisibilities } from "@/modules/workflows/domain/definitions/WorkflowElementPermissions";

const checklistItemSchema = z.object({
  code: z.string(),
  label: z.string(),
  required: z.boolean(),
});

const contextFieldSchema = z.object({
  key: z.string().regex(
    /^(application|fundingCall|workflow|stage|task)\.[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/,
    "Use a supported stable runtime context path.",
  ),
  label: z.string().trim().min(2).max(160),
  type: z.enum(conditionFieldTypes),
});

export const workflowTaskFormSchema = z.object({
  actionKeys: z.array(z.string()).max(100),
  viewPermission: z.enum(staticPermissionCodes),
  editPermission: z.enum(staticPermissionCodes),
  decidePermission: z.enum(staticPermissionCodes),
  visibility: z.enum(workflowElementVisibilities),
  assignmentMode: z.enum(["ROLE", "NAMED_USER"]),
  assignmentTarget: z.string().min(1, "Select an assignee."),
  stableKey: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(
      /^[A-Z][A-Z0-9_]*$/,
      "Use uppercase letters, numbers and underscores.",
    ),
  formVersionId: z.union([z.string().uuid(), z.literal("")]),
  contextFields: z.array(contextFieldSchema).max(200),
  description: z.string().trim().max(1000),
  displayOrder: z.number().int().positive(),
  name: z.string().trim().min(2).max(160),
  reviewerCount: z.number().int().positive().max(100),
  reviewRelease: z.enum(["STAGE_COMPLETED", "THRESHOLD_MET", "IMMEDIATE"]),
  requiredCompletionCount: z.number().int().positive().max(100),
  completionMode: z.enum(["ALL", "COUNT", "PERCENT"]),
  completionPercentage: z.number().int().min(1).max(100).nullable(),
  quorum: z.boolean(),
  quorumMinimumCount: z.number().int().min(1).max(100).nullable().optional(),
  quorumMinimumPercentage: z.number().int().min(1).max(100).nullable().optional(),
  quorumChairRequired: z.boolean().optional(),
  quorumRecusalDenominator: z.enum(["EXCLUDE", "INCLUDE"]).optional(),
  quorumFreeze: z.enum(["AT_DECISION", "ON_FIRST_PASS"]).optional(),
  quorumPopulation: z.enum(["ASSIGNED_TASKS", "REGISTERED"]).optional(),
  quorumAbstentionsCount: z.boolean().optional(),
  coiRequired: z.boolean(),
  required: z.boolean(),
  configJson: z.string().optional(),
  checklistItems: z.array(checklistItemSchema),
}).superRefine((values, context) => {
  if (
    new Set(values.contextFields.map((field) => field.key)).size
      !== values.contextFields.length
  ) {
    context.addIssue({
      code: "custom",
      message: "Runtime context fields must use unique paths.",
      path: ["contextFields"],
    });
  }
  if (values.completionMode === "PERCENT" && !values.completionPercentage) {
    context.addIssue({
      code: "custom",
      message: "Enter the required percentage.",
      path: ["completionPercentage"],
    });
  }
  if (values.requiredCompletionCount > values.reviewerCount) {
    context.addIssue({
      code: "custom",
      message: "Required completions cannot exceed the reviewer count.",
      path: ["requiredCompletionCount"],
    });
  }
  if (values.assignmentMode === "NAMED_USER" && values.reviewerCount !== 1) {
    context.addIssue({
      code: "custom",
      message: "Named-user assignment supports exactly one reviewer.",
      path: ["reviewerCount"],
    });
  }
  if (values.quorum
    && !values.quorumMinimumCount
    && !values.quorumMinimumPercentage) {
    context.addIssue({
      code: "custom",
      message: "Set a minimum quorum count or percentage.",
      path: ["quorumMinimumCount"],
    });
  }
});

export type WorkflowTaskFormValues = z.infer<typeof workflowTaskFormSchema>;

export function checklistItemDefaults(config: unknown) {
  const parsed = z.object({ items: z.array(checklistItemSchema) }).safeParse(config);
  return parsed.success ? parsed.data.items : [];
}

export function taskAssignmentDefaults(task?: WorkflowTaskInput) {
  if (task?.assignmentMode === "NAMED_USER") {
    return {
      assignmentMode: "NAMED_USER" as const,
      assignmentTarget: task.namedUserOverrideId ?? "",
    };
  }
  if (task?.roleId) {
    return {
      assignmentMode: "ROLE" as const,
      assignmentTarget: task.roleId,
    };
  }
  return {
    assignmentMode: "ROLE" as const,
    assignmentTarget: "",
  };
}
