"use client";

import { patchData, requestData } from "@/lib/client-http";
import type { ApplicantProfileUpdateInput } from "./ProfileSchemas";
import type { ApplicantProfileView } from "./ProfileTypes";

const noStore = { cache: "no-store" as const };

function getApplicantProfile() {
  return requestData<ApplicantProfileView>("/api/portal/profile", noStore);
}

function updateApplicantProfile(input: ApplicantProfileUpdateInput) {
  return patchData<ApplicantProfileView, ApplicantProfileUpdateInput>(
    "/api/portal/profile",
    input,
  );
}

export const clientProfileService = {
  getApplicantProfile,
  updateApplicantProfile,
};
