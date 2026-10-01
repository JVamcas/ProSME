"use client";

import { useQuery } from "@tanstack/react-query";
import { clientWorkflowService } from "../../ClientWorkflowService";

export function useWorkflowEligibilityForms(definitionId: string, versionId: string) {
  return useQuery({
    enabled: Boolean(definitionId && versionId),
    queryKey: ["admin", "workflows", definitionId, versionId, "eligibility-forms"],
    queryFn: () => clientWorkflowService.getEligibilityFormPreviews(definitionId, versionId),
    staleTime: 0,
  });
}
