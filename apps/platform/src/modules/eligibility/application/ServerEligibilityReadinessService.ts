import "server-only";

import { readEligibilityReadinessVersion } from "../infrastructure/EligibilityReadinessRepository";
import { findPublishedEligibilityRuleSetForEvaluation } from "../infrastructure/EligibilityEvaluationRepository";

export async function readEligibilityReadinessProjection(versionId: string) {
  const [version, publishedRules] = await Promise.all([
    readEligibilityReadinessVersion(versionId),
    findPublishedEligibilityRuleSetForEvaluation(versionId),
  ]);
  if (!version) return null;
  return {
    rules: publishedRules?.rules ?? [],
    active: version.active,
    status: version.status,
    versionId: version.versionId,
  };
}
