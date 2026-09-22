import { z } from "zod";
import { jsonValueSchema } from "@/modules/conditions/domain/ConditionSerialization";

export const eligibilityTestSchema = z.object({
  mode: z.enum(["SELF_CHECK", "SCREENING"]),
  fundingCallId: z.uuid(),
  values: z.object({
    eligibility: z.record(z.string().min(1), jsonValueSchema),
  }),
  versionId: z.string().uuid(),
});

export type EligibilityTestInput = z.infer<typeof eligibilityTestSchema>;
