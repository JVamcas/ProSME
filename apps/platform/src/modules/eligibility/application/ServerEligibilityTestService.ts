import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import type { EligibilityTestInput } from "../api/EligibilityTestSchemas";
import { evaluateEligibilityRuleSet } from "../engine/EligibilityEvaluator";
import { findTestableEligibilityRuleSetForEvaluation } from "../infrastructure/EligibilityEvaluationRepository";

export async function testEligibilityRuleSet(
  user: AuthenticatedUser | null,
  ruleSetId: string,
  input: EligibilityTestInput,
) {
  requirePermission(user, permissionCodes.eligibilityRuleSetRead);
  const ruleSet = await findTestableEligibilityRuleSetForEvaluation(
    input.versionId,
  );
  if (!ruleSet || ruleSet.ruleSetId !== ruleSetId) {
    throw new ResourceNotFoundError(
      "draft or published eligibility ruleset version",
    );
  }
  return {
    ...evaluateEligibilityRuleSet(ruleSet, input.mode, {
      application: input.values.application,
      fundingCall: input.values.fundingCall,
      stages: [],
    }),
    authoritative: false as const,
  };
}
