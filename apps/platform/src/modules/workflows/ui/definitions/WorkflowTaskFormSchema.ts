import { z } from "zod";
import { eligibilityFailureStatusSchema } from "../../domain/definitions/WorkflowEligibilityFailureStatus";

import type { WorkflowTaskInput } from "@/modules/workflows/domain/definitions/WorkflowTypes";
import {
  workflowTaskDisplayModes,
  workflowTaskFormPurposes,
  workflowTaskTypes,
} from "@/modules/workflows/domain/definitions/WorkflowTaskDefinition";

export const workflowTaskFormSchema = z
  .object({
    taskType: z.enum(workflowTaskTypes),
    assignmentMode: z.enum(["ROLE", "NAMED_USER"]),
    assignmentTarget: z.string().min(1, "Select an assignee."),
    formVersionId: z.union([z.string().uuid(), z.literal("")]),
    formPurpose: z.enum(workflowTaskFormPurposes),
    hardFailureStatus: eligibilityFailureStatusSchema,
    description: z.string().trim().max(1000),
    displayMode: z.enum(workflowTaskDisplayModes),
    displayOrder: z.number().int().positive(),
    name: z.string().trim().min(2).max(160),
    reviewerCount: z.number().int().positive().max(100),
    completionMode: z.enum(["ALL", "COUNT", "PERCENT"]),
    requiredCompletionCount: z.number().int().min(1).max(100).nullable(),
    completionPercentage: z.number().int().min(1).max(100).nullable(),
    required: z.boolean(),
    configJson: z.string().optional(),
  })
  .superRefine((values, context) => {
    if (
      values.completionMode === "COUNT" &&
      values.requiredCompletionCount === null
    ) {
      context.addIssue({
        code: "custom",
        message: "Enter the required completion count.",
        path: ["requiredCompletionCount"],
      });
    }
    if (
      values.completionMode === "COUNT" &&
      values.requiredCompletionCount !== null &&
      values.requiredCompletionCount > values.reviewerCount
    ) {
      context.addIssue({
        code: "custom",
        message: "Required completions cannot exceed the reviewer count.",
        path: ["requiredCompletionCount"],
      });
    }
    if (
      values.completionMode === "PERCENT" &&
      values.completionPercentage === null
    ) {
      context.addIssue({
        code: "custom",
        message: "Enter the completion percentage.",
        path: ["completionPercentage"],
      });
    }
    if (values.assignmentMode === "NAMED_USER" && values.reviewerCount !== 1) {
      context.addIssue({
        code: "custom",
        message: "Named-user assignment supports exactly one reviewer.",
        path: ["reviewerCount"],
      });
    }
    if (values.taskType === "STAGE_DECISION" && values.reviewerCount !== 1) {
      context.addIssue({
        code: "custom",
        message: "A stage-decision task must have exactly one assignee.",
        path: ["reviewerCount"],
      });
    }
  });

export type WorkflowTaskFormValues = z.infer<typeof workflowTaskFormSchema>;

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
