"use client";

import { postData, requestData } from "@/lib/client-http";
import type {
  EligibilityAssessmentInput,
  EligibilityAssessmentView,
  EligibilityWorkspace,
} from "./EligibilityTypes";

function getWorkspace(fundingOpportunityId: number) {
  return requestData<EligibilityWorkspace>(
    `/api/portal/eligibility-assessments?fundingOpportunityId=${fundingOpportunityId}`,
    { cache: "no-store" },
  );
}

function createAssessment(input: EligibilityAssessmentInput) {
  return postData<EligibilityAssessmentView, EligibilityAssessmentInput>(
    "/api/portal/eligibility-assessments",
    input,
  );
}

export const clientEligibilityService = {
  createAssessment,
  getWorkspace,
};

