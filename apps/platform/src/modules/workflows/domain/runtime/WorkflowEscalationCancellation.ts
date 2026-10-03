import { z } from "zod";

export const workflowEscalationCancellationSchema = z
  .object({
    escalationId: z.uuid(),
    expectedRowVersion: z.number().int().positive(),
  })
  .strict();

export type WorkflowEscalationCancellationInput = z.infer<
  typeof workflowEscalationCancellationSchema
>;
