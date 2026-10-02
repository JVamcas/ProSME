import "server-only";

import { eq } from "drizzle-orm";
import {
  applications,
  fundingCalls,
  users,
  workflowAuditEntries,
  workflowEvents,
  workflowInstances,
} from "@/db/schema";
import type { NotificationOccurrenceTransaction } from "@/modules/notifications/infrastructure/NotificationOccurrenceRepository";

export async function readApplicationTerminalStatusContext(
  transaction: NotificationOccurrenceTransaction,
  workflowInstanceId: string,
) {
  const [source] = await transaction.select({
    applicationId: applications.id,
    applicationReference: applications.reference,
    fundingOpportunityTitle: fundingCalls.title,
    owner: {
      displayName: users.displayName,
      email: users.email,
      userId: users.id,
    },
    previousPublicStatus: workflowInstances.publicStatus,
  }).from(workflowInstances)
    .innerJoin(applications, eq(applications.id, workflowInstances.applicationId))
    .innerJoin(users, eq(users.id, applications.ownerUserId))
    .innerJoin(fundingCalls, eq(fundingCalls.id, applications.fundingOpportunityId))
    .where(eq(workflowInstances.id, workflowInstanceId))
    .limit(1);
  if (!source?.applicationReference) {
    throw new Error("The terminal application notification context is unavailable.");
  }
  return { ...source, applicationReference: source.applicationReference };
}

export async function recordApplicationTerminalStatusEvent(
  transaction: NotificationOccurrenceTransaction,
  input: {
    actorId: string;
    correlationId: string;
    context: Record<string, unknown>;
    stageInstanceId?: string;
    taskId?: string;
    workflowInstanceId: string;
  },
) {
  await transaction.insert(workflowEvents).values({
    actorId: input.actorId,
    correlationId: input.correlationId,
    eventCode: "application.terminal-status-reached",
    payload: input.context,
    workflowInstanceId: input.workflowInstanceId,
  });
  await transaction.insert(workflowAuditEntries).values({
    action: "APPLICATION_TERMINAL_STATUS_REACHED",
    actorId: input.actorId,
    after: input.context,
    before: { status: input.context.previousStatus },
    correlationId: input.correlationId,
    stageInstanceId: input.stageInstanceId,
    targetId: String(input.context.applicationId),
    targetType: "APPLICATION",
    taskId: input.taskId,
    workflowInstanceId: input.workflowInstanceId,
  });
}
