import { z } from "zod";

import { conditionGroupSchema } from "@/modules/conditions/domain/ConditionSerialization";
import type { WorkflowTransitionDefinition } from "@/modules/workflows/domain/transitions/WorkflowTransitionDefinition";

import { terminalOutcomeApplicantStatus } from "../../domain/transitions/WorkflowTerminalOutcome";

const stableKeyPattern = /^[A-Z][A-Z0-9_]*$/;

export const workflowTransitionFormSchema = z
  .object({
    actionKey: z.string(),
    targetType: z.enum(["STAGE", "TERMINAL"]),
    targetStageKeys: z.array(z.string()),
    terminalOutcome: z.string(),
    terminalApplicantLabel: z.string().trim().max(120).default(""),
    terminalApplicantDescription: z.string().trim().max(300).default(""),
    priority: z.number().int().positive(),
    condition: conditionGroupSchema.nullable(),
  })
  .superRefine((values, context) => {
    if (values.targetType === "TERMINAL") {
      for (const field of [
        "terminalApplicantLabel",
        "terminalApplicantDescription",
      ] as const) {
        if (!values[field]) {
          context.addIssue({
            code: "custom",
            message: "Enter applicant-facing wording.",
            path: [field],
          });
        }
      }
    }
    const field =
      values.targetType === "STAGE" ? "targetStageKeys" : "terminalOutcome";
    const value = values[field];
    if (!values.actionKey) {
      context.addIssue({
        code: "custom",
        message: "Select an action.",
        path: ["actionKey"],
      });
    }
    if (!value || (Array.isArray(value) && value.length === 0)) {
      context.addIssue({
        code: "custom",
        message:
          values.targetType === "STAGE"
            ? "Select a target stage."
            : "Select a terminal outcome.",
        path: [field],
      });
    } else if (
      (Array.isArray(value) ? value : [value]).some(
        (item) => !stableKeyPattern.test(item),
      )
    ) {
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
  const mapping = terminalOutcomeApplicantStatus(
    transition?.terminalOutcome ?? "",
    transition?.terminalApplicantStatus,
  );
  return {
    terminalApplicantLabel: mapping.label,
    terminalApplicantDescription: mapping.description,
    actionKey: transition?.actionKey ?? actionKey,
    targetType: transition?.terminalOutcome ? "TERMINAL" : "STAGE",
    targetStageKeys: transition?.targetStageKeys ?? [targetStageKey],
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
    targetStageKeys:
      values.targetType === "STAGE" ? values.targetStageKeys : [],
    terminalOutcome:
      values.targetType === "TERMINAL" ? values.terminalOutcome : null,
    terminalApplicantStatus:
      values.targetType === "TERMINAL"
        ? {
            label: values.terminalApplicantLabel,
            description: values.terminalApplicantDescription,
          }
        : null,
    priority: values.priority,
    condition: values.condition,
  };
}
