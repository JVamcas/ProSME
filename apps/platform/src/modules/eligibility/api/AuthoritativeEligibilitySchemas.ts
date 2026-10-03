import { z } from "zod";

export const authoritativeEligibilityExecutionSchema = z
  .object({
    confirmHardFailure: z.boolean().optional(),
    expectedRowVersion: z.number().int().positive(),
    expectedResponseRowVersion: z.number().int().positive().optional(),
    values: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const authoritativeEligibilityCommandKeySchema = z.uuid();
export const authoritativeEligibilityTaskIdSchema = z.uuid();
