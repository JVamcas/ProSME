import { z } from "zod";

import { conditionGroupSchema } from "@/modules/conditions/domain/ConditionSerialization";
import type { WorkflowTransitionDefinition } from "@/modules/workflows/domain/transitions/WorkflowTransitionDefinition";

const stableKeyPattern = /^[A-Z][A-Z0-9_]*$/;

export const workflowTransitionFormSchema = z
  .object({
    actionKey: z.string(),
    targetType: z.enum(["STAGE", "TERMINAL"]),
    targetStageKey: z.string(),
    terminalOutcome: z.string(),
    priority: z.number().int().positive(),
    condition: conditionGroupSchema.nullable(),
  })
  .superRefine((values, context) => {
    const field = values.targetType === "STAGE"
      ? "targetStageKey"
      : "terminalOutcome";
    const value = values[field];
    if (!values.actionKey) {
      context.addIssue({
        code: "custom",
        message: "Select an action.",
        path: ["actionKey"],
      });
    }
    if (!value) {
      context.addIssue({
        code: "custom",
        message: values.targetType === "STAGE"
          ? "Select a target stage."
          : "Select a terminal outcome.",
        path: [field],
      });
    } else if (!stableKeyPattern.test(value)) {
      context.addIssue({
        code: "custom",
        message: "Use uppercase letters, numbers and underscores.",
        path: [field],
      });
    }
  });

export type WorkflowTransitionFormValues = z.infer<
  typeof workflowTransitionFormSchema
>;

export function workflowTransitionFormDefaults(
  transition: WorkflowTransitionDefinition | undefined,
  actionKey: string,
  targetStageKey: string,
  priority: number,
): WorkflowTransitionFormValues {
  return {
    actionKey: transition?.actionKey ?? actionKey,
    targetType: transition?.terminalOutcome ? "TERMINAL" : "STAGE",
    targetStageKey: transition?.targetStageKey ?? targetStageKey,
    terminalOutcome: transition?.terminalOutcome ?? "",
    priority: transition?.priority ?? priority,
    condition: transition?.condition ?? null,
  };
}

export function toWorkflowTransition(
  values: WorkflowTransitionFormValues,
  sourceStageKey: string,
  id?: string,
): WorkflowTransitionDefinition {
  return {
    ...(id ? { id } : {}),
    sourceStageKey,
    actionKey: values.actionKey,
    targetStageKey:
      values.targetType === "STAGE" ? values.targetStageKey : null,
    terminalOutcome:
      values.targetType === "TERMINAL" ? values.terminalOutcome : null,
    priority: values.priority,
    condition: values.condition,
  };
}
