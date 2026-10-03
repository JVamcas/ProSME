import { z } from "zod";

const keySchema = z
  .string()
  .min(2)
  .max(80)
  .regex(/^[A-Z][A-Z0-9_]*$/);

export const workflowActionDeletionSchema = z
  .object({
    actionKey: keySchema,
    stageKey: keySchema,
    versionId: z.uuid(),
    expectedRowVersion: z.number().int().positive(),
  })
  .strict();

export type WorkflowActionDeletionInput = z.infer<
  typeof workflowActionDeletionSchema
>;
