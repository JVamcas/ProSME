import "server-only";

import { WorkflowActionExecutionError } from "../../domain/actions/WorkflowActionExecution";
import { randomUUID } from "node:crypto";
import type { AuthenticatedUser } from "@/auth/types";
import { evaluateStageCondition } from "../../engine/StageCondition";
import {
  loadWorkflowActionNotificationRecipients,
  insertWorkflowActionNotifications,
  type WorkflowActionEmailOccurrence,
} from "@/modules/notifications/infrastructure/WorkflowActionNotificationRepository";
import {
  sanitizeNotificationHtml,
  generateNotificationPlainText,
} from "@/modules/notifications/application/NotificationHtmlImport";
import { renderWorkflowActionEmail } from "@/modules/notifications/application/WorkflowActionEmailContent";
import type {
  WorkflowActionExecutionTarget,
  WorkflowActionExecutionTransaction,
} from "../../infrastructure/WorkflowActionExecutionRepository";
import type { ExecuteWorkflowActionInput } from "./ServerWorkflowActionOutcomeService";

export async function prepareWorkflowActionNotifications(
  transaction: WorkflowActionExecutionTransaction,
  actor: AuthenticatedUser,
  target: WorkflowActionExecutionTarget,
  context: Parameters<typeof evaluateStageCondition>[1],
) {
  const matching = (target.action.notifications ?? []).filter(
    (row) => evaluateStageCondition(row.condition, context).passed,
  );
  if (!matching.length) return [];
  const recipients = await loadWorkflowActionNotificationRecipients(
    transaction,
    {
      actorId: actor.id,
      stageInstanceId: target.stage.stageInstanceId,
      notifications: matching,
    },
  );
  return matching.map((row) => {
    const resolved = recipients.filter(
      (recipient) => recipient.notificationId === row.id,
    );
    if (!resolved.length)
      throw new WorkflowActionExecutionError(
        "INVALID_RUNTIME_CONTEXT",
        `No active recipient could be resolved for notification: ${row.subject}`,
      );
    const html = sanitizeNotificationHtml(row.body);
    const value = {
      applicationId: String(target.stage.application.id),
      applicationReference: String(target.stage.application.reference ?? ""),
      fundingOpportunityTitle: String(target.stage.fundingCall.title ?? ""),
      stageName: resolved[0].stageName,
      actionLabel: target.action.label,
      actorName: actor.displayName,
      subjectTemplate: row.subject,
      htmlTemplate: html,
      plainTextTemplate: generateNotificationPlainText(html),
    };
    // Validate every recipient before applying the action; delivery uses this snapshot.
    for (const recipient of resolved)
      renderWorkflowActionEmail(value, recipient.displayName);
    return { rowId: row.id, context: value, recipients: resolved };
  });
}

export async function captureWorkflowActionNotifications(
  transaction: WorkflowActionExecutionTransaction,
  command: ExecuteWorkflowActionInput,
  actionExecutionId: string,
  prepared: Awaited<ReturnType<typeof prepareWorkflowActionNotifications>>,
) {
  if (!prepared.length) return;
  const occurrences: WorkflowActionEmailOccurrence[] = prepared.map((row) => ({
    id: randomUUID(),
    occurrenceKey: `action:${actionExecutionId}:notification:${row.rowId}`,
    context: row.context,
    recipients: row.recipients,
  }));
  await insertWorkflowActionNotifications(transaction, {
    applicationId: prepared[0].context.applicationId,
    correlationId: command.correlationId,
    occurrences,
  });
}
