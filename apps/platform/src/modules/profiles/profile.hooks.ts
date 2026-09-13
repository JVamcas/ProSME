"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ApplicantProfileUpdateInput } from "./profile.schemas";
import { profileClientService } from "./profile-client.service";

export const profileQueryKeys = {
  applicant: ["portal", "applicant-profile"] as const,
};

export function useApplicantProfile() {
  return useQuery({
    queryKey: profileQueryKeys.applicant,
    queryFn: profileClientService.getApplicantProfile,
  });
}

export function useUpdateApplicantProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ApplicantProfileUpdateInput) =>
      profileClientService.updateApplicantProfile(input),
    onSuccess: (profile) => {
      queryClient.setQueryData(profileQueryKeys.applicant, profile);
    },
  });
}
