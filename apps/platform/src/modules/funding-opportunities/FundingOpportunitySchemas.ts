import { z } from "zod";

export const fundingOpportunitySearchSchema = z.object({
  search: z.string().max(100),
});

export type FundingOpportunitySearchInput = z.infer<
  typeof fundingOpportunitySearchSchema
>;
