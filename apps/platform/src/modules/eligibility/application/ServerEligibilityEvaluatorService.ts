import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import type { WorkflowDataContext } from "@/modules/conditions/engine/WorkflowDataResolver";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import type { EligibilityEvaluationMode } from "../domain/EligibilityEvaluation";
import { evaluateEligibilityRuleSet } from "../engine/EligibilityEvaluator";
import { findPublishedEligibilityRuleSetForEvaluation } from "../infrastructure/EligibilityEvaluationRepository";

export async function evaluatePublishedEligibilityRuleSet(
  user: AuthenticatedUser | null,
  versionId: string,
  mode: EligibilityEvaluationMode,
  data: WorkflowDataContext,
) {
  requirePermission(user, permissionCodes.eligibilityRuleSetRead);
  const ruleSet = await findPublishedEligibilityRuleSetForEvaluation(versionId);
  if (!ruleSet) {
    throw new ResourceNotFoundError("published eligibility ruleset version");
  }
  return evaluateEligibilityRuleSet(ruleSet, mode, data);
}
