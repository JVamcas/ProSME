import "server-only";

import { ResourceConflictError } from "@/lib/resource-errors";
import { captureApplicationTerminalStatus } from "@/modules/applications/application/ServerApplicationTerminalStatusService";
import type { EligibilityFinding } from "@/modules/eligibility/domain/EligibilityEvaluation";
import {
  eligibilityHardFailureStatus,
  eligibilityFailureStatusLabels,
} from "../../domain/definitions/WorkflowEligibilityFailureStatus";
import { rejectTerminalWorkflow } from "../../infrastructure/WorkflowRejectionRepository";
import type { WorkflowActionExecutionTransaction } from "../../infrastructure/WorkflowActionExecutionRepository";

// Internal hook: the authoritative screening service verifies edit permission,
// task assignment and COI before invoking this within its evaluation transaction.
export async function terminateWorkflowOnEligibilityFailure(
  transaction: WorkflowActionExecutionTransaction,
  input: {
    actorId: string;
    config: unknown;
    correlationId: string;
    evaluatedAt: Date;
    evaluationId: string;
    hardFailures: readonly EligibilityFinding[];
    stageInstanceId: string;
    taskId: string;
    workflowInstanceId: string;
  },
) {
  if (!input.hardFailures.length) return null;
  const status = eligibilityHardFailureStatus(input.config);
  const label = eligibilityFailureStatusLabels[status];
  await captureApplicationTerminalStatus(transaction, {
    ...input,
    failedRuleIds: input.hardFailures.map((finding) => finding.ruleId),
    newStatus: status,
    occurredAt: input.evaluatedAt,
    reasonCodes: [...new Set(input.hardFailures.map((finding) => finding.reasonCode))],
    sourceIdempotencyKey: `eligibility:${input.evaluationId}`,
    statusLabel: label,
  });
  const rejected = await rejectTerminalWorkflow(transaction, {
    actorId: input.actorId,
    configuration: {
      cancelOpenStageInstances: true,
      cancelOpenTasks: true,
      publicStatusMapping: {
        description: "Your application did not meet the eligibility requirements.",
        label,
        status,
      },
      type: "TERMINAL",
    },
    correlationId: input.correlationId,
    rejectedAt: input.evaluatedAt,
    sourceStageInstanceId: input.stageInstanceId,
    terminalOutcome: status,
    workflowInstanceId: input.workflowInstanceId,
  });
  if (!rejected) {
    throw new ResourceConflictError("The workflow changed before eligibility termination.");
  }
  return status;
}
