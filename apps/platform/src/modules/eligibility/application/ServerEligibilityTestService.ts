import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import { resolveEligibilityTestFundingCall } from "@/modules/funding-calls/ServerFundingCallEligibilityContextIntegration";
import type { EligibilityTestInput } from "../api/EligibilityTestSchemas";
import { evaluateEligibilityRuleSet } from "../engine/EligibilityEvaluator";
import { findTestableEligibilityRuleSetForEvaluation } from "../infrastructure/EligibilityEvaluationRepository";

export async function testEligibilityRuleSet(
  user: AuthenticatedUser | null,
  ruleSetId: string,
  input: EligibilityTestInput,
) {
  requirePermission(user, permissionCodes.eligibilityRuleSetRead);
  const [ruleSet, fundingCall] = await Promise.all([
    findTestableEligibilityRuleSetForEvaluation(input.versionId),
    resolveEligibilityTestFundingCall(input.fundingCallId, input.versionId),
  ]);
  if (!ruleSet || ruleSet.ruleSetId !== ruleSetId) {
    throw new ResourceNotFoundError(
      "draft or published eligibility ruleset version",
    );
  }
  if (!fundingCall) {
    throw new ResourceNotFoundError(
      "funding call bound to this eligibility ruleset version",
    );
  }
  return {
    ...evaluateEligibilityRuleSet(ruleSet, input.mode, {
      application: input.values.application,
      eligibility: {},
      fundingCall: {
        closes_at: fundingCall.closesAt.toISOString(),
        funding_instrument: fundingCall.fundingInstrument,
        maximum_grant_amount: Number(fundingCall.maximumGrantAmount),
        minimum_grant_amount: Number(fundingCall.minimumGrantAmount),
        opens_at: fundingCall.opensAt.toISOString(),
        thematic_area: fundingCall.thematicArea,
        total_budget_envelope: Number(fundingCall.totalBudgetEnvelope),
      },
      stages: [],
    }),
    authoritative: false as const,
  };
}
