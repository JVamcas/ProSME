"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  return useMutation({
    mutationFn: (input: ApplicantProfileUpdateInput) =>
      clientProfileService.updateApplicantProfile(input),
    onSuccess: (profile, input) => {
      queryClient.setQueryData(profileQueryKeys.applicant, profile);
      if (input.section === "personal") {
        router.refresh();
      }
    },
  });
}
