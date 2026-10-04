import { eligibilityFailureStatusSchema } from "@/modules/workflows/domain/definitions/WorkflowEligibilityFailureStatus";
import type { AuthoritativeEligibilityOutcomeWrite } from "../infrastructure/AuthoritativeEligibilityRepository";

export function eligibilityExecutionResult(
  outcome: AuthoritativeEligibilityOutcomeWrite & { id: string; terminalStatus?: unknown },
  rowVersion: number,
) {
  const terminalStatus = eligibilityFailureStatusSchema.safeParse(outcome.terminalStatus);
  return {
    eligible: outcome.eligible,
    evaluationId: outcome.id,
    evaluationNumber: outcome.evaluationNumber,
    hardFailureCount: outcome.hardFailures.length,
    manualScreeningRequired: outcome.manualScreeningRequired,
    outcome: outcome.finalOutcome,
    rowVersion,
    ...(terminalStatus.success ? {
      terminalStatus: terminalStatus.data,
    } : {}),
    softFailureCount: outcome.softFailures.length,
    warningCount: outcome.warnings.length,
  };
}
