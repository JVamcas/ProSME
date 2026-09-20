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
    targetStageKey: stableKeySchema.nullable().optional(),
    terminalOutcome: stableKeySchema.nullable().optional(),
    priority: z.number().int().positive(),
    condition: conditionGroupSchema.nullable(),
  })
  .strict()
  .superRefine((transition, context) => {
    if (
      Boolean(transition.targetStageKey) ===
      Boolean(transition.terminalOutcome)
    ) {
      context.addIssue({
        code: "custom",
        message: "Select one target stage or terminal outcome.",
        path: ["targetStageKey"],
      });
    }
  });
