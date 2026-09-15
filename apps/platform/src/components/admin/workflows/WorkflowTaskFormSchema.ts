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
    checklistItems: z.array(z.object({
      code: z.string().trim().min(2).max(80).regex(
        /^[A-Z][A-Z0-9_]*$/,
        "Use uppercase letters, numbers and underscores.",
      ),
      label: z.string().trim().min(2).max(200),
      required: z.boolean(),
    })).max(30),
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
    if (values.type === "CHECKLIST") {
      if (!values.checklistItems.length) {
        context.addIssue({
          code: "custom",
          message: "Add at least one checklist item.",
          path: ["checklistItems"],
        });
      }
      const codes = values.checklistItems.map((item) => item.code);
      if (new Set(codes).size !== codes.length) {
        context.addIssue({
          code: "custom",
          message: "Checklist item codes must be unique.",
          path: ["checklistItems"],
        });
      }
      return;
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

export function checklistItemDefaults(config: unknown) {
  const result = z.object({
    items: z.array(z.object({
      code: z.string(),
      label: z.string(),
      required: z.boolean(),
    })),
  }).safeParse(config);
  return result.success ? result.data.items : [];
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
  return { assignmentMode: "ROLE" as const, assignmentTarget: "" };
}
