import type { AuthoritativeEligibilityOutcomeWrite } from "../infrastructure/AuthoritativeEligibilityRepository";

export function eligibilityExecutionResult(
  outcome: AuthoritativeEligibilityOutcomeWrite & { id: string },
  rowVersion: number,
) {
  return {
    eligible: outcome.eligible,
    evaluationId: outcome.id,
    evaluationNumber: outcome.evaluationNumber,
    hardFailureCount: outcome.hardFailures.length,
    manualScreeningRequired: outcome.manualScreeningRequired,
    outcome: outcome.finalOutcome,
    rowVersion,
    softFailureCount: outcome.softFailures.length,
    warningCount: outcome.warnings.length,
  };
}
