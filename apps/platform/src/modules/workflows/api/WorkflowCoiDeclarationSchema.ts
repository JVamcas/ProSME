import { z } from "zod";

export const workflowCoiDeclarationSchema = z.object({
  expectedRowVersion: z.number().int().positive(),
  formVersionId: z.uuid(),
  values: z.record(z.string(), z.unknown()),
}).strict();

export type WorkflowCoiDeclarationInput = z.infer<typeof workflowCoiDeclarationSchema>;
