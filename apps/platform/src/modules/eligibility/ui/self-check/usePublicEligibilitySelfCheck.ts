"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import { clientEligibilitySelfCheckService } from "../../ClientEligibilitySelfCheckService";
import type { PublicEligibilitySelfCheckInput } from "../../api/PublicEligibilitySelfCheckTransport";

const publicEligibilitySelfCheckKeys = {
  detail: (fundingCallId: string) =>
    ["public", "eligibility-self-check", fundingCallId] as const,
};

export function usePublicEligibilitySelfCheck(fundingCallId: string) {
  return useQuery({
    queryFn: () => clientEligibilitySelfCheckService.get(fundingCallId),
    queryKey: publicEligibilitySelfCheckKeys.detail(fundingCallId),
  });
}

export function useEvaluatePublicEligibilitySelfCheck(fundingCallId: string) {
  return useMutation({
    mutationFn: (input: PublicEligibilitySelfCheckInput) =>
      clientEligibilitySelfCheckService.evaluate(fundingCallId, input),
  });
}
