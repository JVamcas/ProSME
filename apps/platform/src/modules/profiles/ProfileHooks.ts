"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ApplicantProfileUpdateInput } from "./ProfileSchemas";
import { clientProfileService } from "./ClientProfileService";

export const profileQueryKeys = {
  applicant: ["portal", "applicant-profile"] as const,
};

export function useApplicantProfile() {
  return useQuery({
    queryKey: profileQueryKeys.applicant,
    queryFn: clientProfileService.getApplicantProfile,
  });
}

export function useUpdateApplicantProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ApplicantProfileUpdateInput) =>
      clientProfileService.updateApplicantProfile(input),
    onSuccess: (profile) => {
      queryClient.setQueryData(profileQueryKeys.applicant, profile);
    },
  });
}
