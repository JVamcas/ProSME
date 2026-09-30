import { z } from "zod";

import { conditionGroupSchema } from "@/modules/conditions/domain/ConditionSerialization";

export const workflowStageFormSchema = z
  .object({
    name: z.string().trim().min(2).max(160),
    description: z.string().trim().max(1000),
    enabled: z.boolean(),
    optional: z.boolean(),
    repeatable: z.boolean(),
    coiGated: z.boolean(),
    coiFormVersionId: z.union([
      z.literal(""),
      z.string().uuid(),
      z.null(),
    ]),
    entryCondition: conditionGroupSchema.nullable(),
    exitCondition: conditionGroupSchema.nullable(),
    joinPredecessorStageKeys: z.array(z.string()),
  })
  .superRefine((values, context) => {
    if (values.coiGated && !values.coiFormVersionId) {
      context.addIssue({
        code: "custom",
        message: "Select a published COI form version.",
        path: ["coiFormVersionId"],
      });
    }
    if (values.joinPredecessorStageKeys.length === 1) {
      context.addIssue({
        code: "custom",
        message: "Select at least two predecessor stages for a join.",
        path: ["joinPredecessorStageKeys"],
      });
    }
  });

export type WorkflowStageFormInput = z.input<typeof workflowStageFormSchema>;
export type WorkflowStageFormValues = z.output<typeof workflowStageFormSchema>;
