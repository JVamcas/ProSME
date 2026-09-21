import "server-only";

import { ResourceNotFoundError } from "@/lib/resource-errors";
import { resolveApplicationEligibilityRuleSetBinding } from "@/modules/applications/ServerApplicationEligibilityIntegration";
import { resolvePublishedEligibilityRuleSetBinding } from "@/modules/funding-calls/ServerFundingOpportunityIntegration";
import { findRuntimeEligibilityRuleSetForEvaluation } from "../infrastructure/EligibilityEvaluationRepository";

async function requireRuntimeVersion(versionId: string | null) {
  if (!versionId) {
    throw new ResourceNotFoundError("bound eligibility ruleset version");
  }
  const ruleSet = await findRuntimeEligibilityRuleSetForEvaluation(versionId);
  if (!ruleSet) {
    throw new ResourceNotFoundError("bound eligibility ruleset version");
  }
  return ruleSet;
}

export async function resolveSelfCheckEligibilityRuleSet(
  fundingCallId: string,
) {
  const binding = await resolvePublishedEligibilityRuleSetBinding(
    fundingCallId,
  );
  return requireRuntimeVersion(
    binding?.eligibilityRuleSetVersionId ?? null,
  );
}

export async function resolveScreeningEligibilityRuleSet(
  applicationId: string,
) {
  const binding = await resolveApplicationEligibilityRuleSetBinding(
    applicationId,
  );
  return requireRuntimeVersion(
    binding?.eligibilityRuleSetVersionId ?? null,
  );
}
