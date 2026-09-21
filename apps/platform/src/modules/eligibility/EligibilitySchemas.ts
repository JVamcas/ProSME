import { z } from "zod";

export const eligibilityAssessmentSchema = z.object({
  answers: z.record(z.string().min(1), z.enum(["yes", "no"])),
  expectedRuleSetVersion: z.string().min(1).max(64),
  fundingOpportunityId: z.uuid(),
}).strict();
