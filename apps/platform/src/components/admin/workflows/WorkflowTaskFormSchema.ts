import { z } from "zod";

import type { WorkflowTaskInput } from "@/modules/workflows/WorkflowTypes";
import { taskTypeCodes } from "@/modules/workflows/WorkflowTypes";

const checklistItemSchema = z.object({
  code: z.string(),
  label: z.string(),
  required: z.boolean(),
});

export const workflowTaskFormSchema = z.object({
  assignmentMode: z.enum(["ROLE", "USER"]),
  assignmentTarget: z.string().min(1, "Select an assignee."),
  code: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(
      /^[A-Z][A-Z0-9_]*$/,
      "Use uppercase letters, numbers and underscores.",
    ),
  formVersionId: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(160),
  required: z.boolean(),
  type: z.enum(taskTypeCodes).optional(),
  configJson: z.string().optional(),
  checklistItems: z.array(checklistItemSchema),
}).superRefine((values, context) => {
  if (!values.formVersionId && !values.type) {
    context.addIssue({
      code: "custom",
      message: "Select a published form version.",
      path: ["formVersionId"],
    });
  }
});

export type WorkflowTaskFormValues = z.infer<typeof workflowTaskFormSchema>;

export function checklistItemDefaults(config: unknown) {
  const parsed = z.object({ items: z.array(checklistItemSchema) }).safeParse(config);
  return parsed.success ? parsed.data.items : [];
}

export function taskAssignmentDefaults(task?: WorkflowTaskInput) {
  if (task?.assignmentUserId) {
    return {
      assignmentMode: "USER" as const,
      assignmentTarget: task.assignmentUserId,
    };
  }
  if (task?.assignmentRoleId) {
    return {
      assignmentMode: "ROLE" as const,
      assignmentTarget: task.assignmentRoleId,
    };
  }
  return {
    assignmentMode: "ROLE" as const,
    assignmentTarget: "",
  };
}
