import "server-only";

import { ResourceNotFoundError } from "@/lib/resource-errors";
import { resolveApplicationEligibilityRuleSetBinding } from "@/modules/applications/ServerApplicationEligibilityIntegration";
import { resolvePublishedEligibilityRuleSetBinding } from "@/modules/funding-calls/ServerFundingOpportunityIntegration";
import { findRuntimeEligibilityRuleSetForEvaluation } from "../infrastructure/EligibilityEvaluationRepository";
import { getPublishedFormRuntime } from "@/modules/forms/infrastructure/FormRepository";

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

export async function resolveSelfCheckEligibilityConfiguration(
  fundingCallId: string,
) {
  const binding = await resolvePublishedEligibilityRuleSetBinding(
    fundingCallId,
  );
  const ruleSet = await requireRuntimeVersion(
    binding?.eligibilityRuleSetVersionId ?? null,
  );
  if (!binding?.formVersionId) {
    throw new ResourceNotFoundError("bound application form version");
  }
  const form = await getPublishedFormRuntime(binding.formVersionId);
  if (!form) {
    throw new ResourceNotFoundError("bound application form version");
  }
  return { form, ruleSet };
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
