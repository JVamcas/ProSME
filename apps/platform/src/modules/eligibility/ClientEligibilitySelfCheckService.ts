"use client";

import { postData, requestData } from "@/lib/client-http";
import { clientWebsiteAnalyticsService } from "@/modules/reporting/ClientWebsiteAnalyticsService";
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

async function evaluate(
  fundingCallId: string,
  input: PublicEligibilitySelfCheckInput,
) {
  const result = await postData<
    PublicEligibilitySelfCheckResult,
    PublicEligibilitySelfCheckInput
  >(`/api/public/eligibility-self-checks/${fundingCallId}`, input);
  clientWebsiteAnalyticsService.track("eligibility_check_complete", {
    fundingCallId: result.fundingCallId,
    outcome: result.outcome,
  });
  return result;
}

export const clientEligibilitySelfCheckService = { evaluate, get };
