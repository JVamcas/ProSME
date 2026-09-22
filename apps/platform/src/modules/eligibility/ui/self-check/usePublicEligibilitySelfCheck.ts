"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ClientRequestError } from "@/lib/client-http";
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PublicEligibilitySelfCheckInput) =>
      clientEligibilitySelfCheckService.evaluate(fundingCallId, input),
    onError: (error) => {
      if (error instanceof ClientRequestError && error.code === "CONFLICT") {
        void queryClient.invalidateQueries({
          queryKey: publicEligibilitySelfCheckKeys.detail(fundingCallId),
        });
      }
    },
  });
}
