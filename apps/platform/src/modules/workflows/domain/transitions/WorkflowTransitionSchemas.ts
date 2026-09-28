import { z } from "zod";

import { conditionGroupSchema } from "@/modules/conditions/domain/ConditionSerialization";

const stableKeySchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[A-Z][A-Z0-9_]*$/);

export const workflowTransitionSchema = z
  .object({
    id: z.string().uuid().optional(),
    sourceStageKey: stableKeySchema,
    actionKey: stableKeySchema,
    targetStageKeys: z.array(stableKeySchema).max(50),
    terminalOutcome: stableKeySchema.nullable().optional(),
    priority: z.number().int().positive(),
    condition: conditionGroupSchema.nullable(),
  })
  .strict()
  .superRefine((transition, context) => {
    if (
      Boolean(transition.targetStageKeys.length) ===
      Boolean(transition.terminalOutcome)
    ) {
      context.addIssue({
        code: "custom",
        message: "Select one or more target stages or a terminal outcome.",
        path: ["targetStageKeys"],
      });
    }
    if (new Set(transition.targetStageKeys).size !== transition.targetStageKeys.length) {
      context.addIssue({
        code: "custom",
        message: "Transition targets must be unique.",
        path: ["targetStageKeys"],
      });
    }
  });
