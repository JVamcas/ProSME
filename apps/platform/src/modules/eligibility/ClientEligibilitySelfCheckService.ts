"use client";

import { postData, requestData } from "@/lib/client-http";
import type {
  PublicEligibilitySelfCheckInput,
  PublicEligibilitySelfCheckResult,
  PublicEligibilitySelfCheckWorkspace,
} from "./api/PublicEligibilitySelfCheckTransport";

function get(fundingCallId: string) {
  return requestData<PublicEligibilitySelfCheckWorkspace>(
    `/api/public/eligibility-self-checks/${fundingCallId}`,
    { cache: "no-store" },
  );
}

function evaluate(
  fundingCallId: string,
  input: PublicEligibilitySelfCheckInput,
) {
  return postData<
    PublicEligibilitySelfCheckResult,
    PublicEligibilitySelfCheckInput
  >(`/api/public/eligibility-self-checks/${fundingCallId}`, input);
}

export const clientEligibilitySelfCheckService = { evaluate, get };
