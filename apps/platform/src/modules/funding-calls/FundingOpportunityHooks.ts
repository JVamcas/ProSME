"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { clientFundingOpportunityService } from "./ClientFundingOpportunityService";
import type { FundingOpportunityListInput } from "./FundingOpportunityTypes";

export const fundingOpportunityQueryKeys = {
  all: ["portal", "funding-opportunities"] as const,
  list: (input: FundingOpportunityListInput) =>
    ["portal", "funding-opportunities", "list", input] as const,
  detail: (id: string) =>
    ["portal", "funding-opportunities", "detail", id] as const,
};

export function useFundingOpportunities(
  input: FundingOpportunityListInput,
) {
  return useQuery({
    placeholderData: keepPreviousData,
    queryFn: () =>
      clientFundingOpportunityService.listFundingOpportunities(input),
    queryKey: fundingOpportunityQueryKeys.list(input),
  });
}

export function useFundingOpportunity(id: string) {
  return useQuery({
    queryFn: () =>
      clientFundingOpportunityService.getFundingOpportunity(id),
    queryKey: fundingOpportunityQueryKeys.detail(id),
  });
}
