import { z } from "zod";

export const applicationSubmissionCommandSchema = z.object({
  expectedApplicationRowVersion: z.number().int().positive(),
  finalConfirmation: z.literal(true),
  readinessToken: z.string().min(1).max(4000),
}).strict();

export type ApplicationSubmissionCommandInput = z.infer<
  typeof applicationSubmissionCommandSchema
>;
