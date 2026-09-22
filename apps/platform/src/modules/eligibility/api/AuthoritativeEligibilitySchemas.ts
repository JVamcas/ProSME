import { z } from "zod";

export const authoritativeEligibilityExecutionSchema = z.object({
  expectedRowVersion: z.number().int().positive(),
}).strict();

export const authoritativeEligibilityCommandKeySchema = z.uuid();
export const authoritativeEligibilityTaskIdSchema = z.uuid();
