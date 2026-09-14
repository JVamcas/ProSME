import { z } from "zod";

import { validateTaskConfiguration } from "@/modules/workflows/WorkflowTaskRegistry";
import {
  taskTypeCodes,
  type WorkflowTaskInput,
} from "@/modules/workflows/WorkflowTypes";

export function parseTaskConfiguration(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

export const workflowTaskFormSchema = z
  .object({
    assignmentMode: z.enum(["ROLE", "USER"]),
    assignmentTarget: z.string(),
    code: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .regex(
        /^[A-Z][A-Z0-9_]*$/,
        "Use uppercase letters, numbers and underscores.",
      ),
    configJson: z.string().min(2),
    name: z.string().trim().min(2).max(160),
    required: z.boolean(),
    type: z.enum(taskTypeCodes),
  })
  .superRefine((values, context) => {
    if (!values.assignmentTarget) {
      context.addIssue({
        code: "custom",
        message: "Select an assignee.",
        path: ["assignmentTarget"],
      });
    }
    const config = parseTaskConfiguration(values.configJson);
    if (
      config === undefined ||
      !validateTaskConfiguration(values.type, config).success
    ) {
      context.addIssue({
        code: "custom",
        message: `Enter valid ${values.type.replaceAll("_", " ").toLowerCase()} configuration.`,
        path: ["configJson"],
      });
    }
  });

export type WorkflowTaskFormValues = z.infer<typeof workflowTaskFormSchema>;

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
  return { assignmentMode: "ROLE" as const, assignmentTarget: "" };
}
