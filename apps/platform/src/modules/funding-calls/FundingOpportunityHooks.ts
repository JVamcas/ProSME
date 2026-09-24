"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { clientFundingOpportunityService } from "./ClientFundingOpportunityService";
import type { PublicFundingCallListInput } from "./api/PublicFundingCallTransport";

export const fundingOpportunityQueryKeys = {
  all: ["portal", "funding-opportunities"] as const,
  list: (input: PublicFundingCallListInput) =>
    ["portal", "funding-opportunities", "list", input] as const,
  detail: (id: string) =>
    ["portal", "funding-opportunities", "detail", id] as const,
};

export function useFundingOpportunities(
  input: PublicFundingCallListInput,
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
