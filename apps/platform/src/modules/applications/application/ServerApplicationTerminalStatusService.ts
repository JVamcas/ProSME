import "server-only";

import { captureNotificationOccurrence } from "@/modules/notifications/application/ServerNotificationOccurrenceService";
import type { NotificationOccurrenceTransaction } from "@/modules/notifications/infrastructure/NotificationOccurrenceRepository";
import {
  readApplicationTerminalStatusContext,
  recordApplicationTerminalStatusEvent,
} from "../infrastructure/ApplicationTerminalStatusRepository";

// Internal transaction hook. Callers authorize and validate the terminal operation.
export async function captureApplicationTerminalStatus(
  transaction: NotificationOccurrenceTransaction,
  input: {
    actorId: string;
    correlationId: string;
    failedRuleIds?: string[];
    newStatus: string;
    statusLabel: string;
    occurredAt: Date;
    reasonCodes?: string[];
    sourceIdempotencyKey: string;
    stageInstanceId?: string;
    taskId?: string;
    workflowInstanceId: string;
  },
) {
  const source = await readApplicationTerminalStatusContext(
    transaction,
    input.workflowInstanceId,
  );
  const context = {
    applicationId: source.applicationId,
    applicationReference: source.applicationReference,
    correlationId: input.correlationId,
    failedRuleIds: input.failedRuleIds ?? [],
    fundingOpportunityTitle: source.fundingOpportunityTitle,
    newStatus: input.newStatus,
    occurredAt: input.occurredAt.toISOString(),
    owner: source.owner,
    previousStatus: source.previousPublicStatus?.status ?? "SUBMITTED",
    reasonCodes: input.reasonCodes ?? [],
    sourceIdempotencyKey: input.sourceIdempotencyKey,
    statusLabel: input.statusLabel,
    workflowInstanceId: input.workflowInstanceId,
  };
  const occurrence = await captureNotificationOccurrence(transaction, {
    aggregateId: source.applicationId,
    aggregateType: "APPLICATION",
    context,
    correlationId: input.correlationId,
    eventKey: "application.terminal-status-reached",
    occurrenceKey: `terminal-status:${input.workflowInstanceId}:${input.sourceIdempotencyKey}`,
    recipients: [{
      ...source.owner,
      recipientType: "APPLICATION_OWNER",
      resolutionPath: "APPLICATION_OWNER",
    }],
  });
  if (occurrence.created) {
    await recordApplicationTerminalStatusEvent(transaction, { ...input, context });
  }
  return occurrence;
}
