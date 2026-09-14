"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { clientEligibilityService } from "./ClientEligibilityService";
import type { EligibilityAssessmentInput } from "./EligibilityTypes";

export const eligibilityQueryKeys = {
  workspace: (fundingOpportunityId: number) =>
    ["portal", "eligibility-assessments", fundingOpportunityId] as const,
};

export function useEligibilityWorkspace(fundingOpportunityId: number) {
  return useQuery({
    queryFn: () => clientEligibilityService.getWorkspace(fundingOpportunityId),
    queryKey: eligibilityQueryKeys.workspace(fundingOpportunityId),
  });
}

export function useCreateEligibilityAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: EligibilityAssessmentInput) =>
      clientEligibilityService.createAssessment(input),
    onSuccess: (assessment) => queryClient.invalidateQueries({
      queryKey: eligibilityQueryKeys.workspace(
        assessment.fundingOpportunityId,
      ),
    }),
  });
}

