import { z } from "zod";

export const fundingCallPublicInteractionSchema = z
  .object({
    enabled: z.boolean(),
    expectedRowVersion: z.number().int().positive(),
  })
  .strict();

export type FundingCallPublicInteractionInput = z.infer<
  typeof fundingCallPublicInteractionSchema
>;
