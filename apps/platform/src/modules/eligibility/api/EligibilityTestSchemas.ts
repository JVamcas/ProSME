import { z } from "zod";

const nonNegativeNumber = z.number().finite().nonnegative();

export const eligibilityTestSchema = z.object({
  mode: z.enum(["SELF_CHECK", "SCREENING"]),
  values: z.object({
    application: z.object({
      annual_turnover: nonNegativeNumber,
      business: z.object({
        bank_account_active: z.boolean(),
        employee_count: z.number().int().nonnegative(),
        operating_months: z.number().int().nonnegative(),
        ownership_percentage: nonNegativeNumber.max(100),
        registered: z.boolean(),
        statutory_good_standing: z.boolean(),
      }),
      requested_amount: nonNegativeNumber,
    }),
    fundingCall: z.object({
      maximum_grant_amount: nonNegativeNumber,
    }),
  }),
  versionId: z.string().uuid(),
});

export type EligibilityTestInput = z.infer<typeof eligibilityTestSchema>;
