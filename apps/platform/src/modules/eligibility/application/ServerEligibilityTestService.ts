import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  RequestValidationError,
  ResourceNotFoundError,
} from "@/lib/resource-errors";
import { resolveEligibilityTestFundingCall } from "@/modules/funding-calls/ServerFundingCallEligibilityContextIntegration";
import type { EligibilityTestInput } from "../api/EligibilityTestSchemas";
import { evaluateEligibilityRuleSet } from "../engine/EligibilityEvaluator";
import { findTestableEligibilityRuleSetForEvaluation } from "../infrastructure/EligibilityEvaluationRepository";
import { listEligibilityInputs } from "../infrastructure/EligibilityInputRepository";
import {
  eligibilityInputPathsForEvaluation,
  resolveEligibilitySampleInputs,
} from "./EligibilityInputResolver";
import { EligibilityInputResolutionError } from "../domain/EligibilityDataResolution";

export async function testEligibilityRuleSet(
  user: AuthenticatedUser | null,
  ruleSetId: string,
  input: EligibilityTestInput,
) {
  requirePermission(user, permissionCodes.eligibilityRuleSetRead);
  const [ruleSet, fundingCall, inputs] = await Promise.all([
    findTestableEligibilityRuleSetForEvaluation(input.versionId),
    resolveEligibilityTestFundingCall(input.fundingCallId, input.versionId),
    listEligibilityInputs(input.versionId),
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
  const evaluatedAt = new Date();
  let resolved;
  try {
    resolved = resolveEligibilitySampleInputs({
      inputs,
      mode: input.mode,
      paths: eligibilityInputPathsForEvaluation(ruleSet, input.mode),
      values: input.values.eligibility,
    });
  } catch (error) {
    if (error instanceof EligibilityInputResolutionError) {
      throw new RequestValidationError(error.message);
    }
    throw error;
  }
  return {
    ...evaluateEligibilityRuleSet(ruleSet, input.mode, {
      application: {},
      eligibility: resolved.values,
      fundingCall: {},
      stages: [],
    }),
    authoritative: false as const,
    evaluatedAt: evaluatedAt.toISOString(),
  };
}
