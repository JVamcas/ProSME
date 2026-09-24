import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";

import {
  applicationAuditEntries,
  applicationLifecycleHistory,
  applications,
  stageInstances,
  transactionalOutbox,
  workflowAuditEntries,
  workflowEvents,
  workflowInstances,
  workflowTasks,
} from "@/db/schema";
import type { SubmissionTransaction } from "./ApplicationSubmissionRepository";

export type WithdrawalApplicationState = {
  id: string;
  reference: string;
  rowVersion: number;
};

export async function applyApplicationWithdrawalInTransaction(
  transaction: SubmissionTransaction,
  input: {
    actorId: string;
    application: WithdrawalApplicationState;
    correlationId: string;
    reasonCode?: string;
    stageId?: string;
    workflowId: string;
    withdrawnAt: Date;
  },
) {
  const withdrawnAt = input.withdrawnAt;
  const result = {
    applicationId: input.application.id,
    reference: input.application.reference,
    withdrawnAt: withdrawnAt.toISOString(),
  };
  await transaction
    .update(workflowTasks)
    .set({
      completedAt: withdrawnAt,
      rowVersion: sql`${workflowTasks.rowVersion} + 1`,
      status: "CANCELLED",
    })
    .where(and(
      sql`${workflowTasks.status} NOT IN ('COMPLETED', 'CANCELLED')`,
      sql`EXISTS (
        SELECT 1 FROM app_workflow_stage_instances withdrawal_stage
        WHERE withdrawal_stage.id = ${workflowTasks.stageInstanceId}
          AND withdrawal_stage.workflow_instance_id = ${input.workflowId}::uuid
      )`,
    ));
  await transaction
    .update(stageInstances)
    .set({
      completedAt: withdrawnAt,
      rowVersion: sql`${stageInstances.rowVersion} + 1`,
      status: "CANCELLED",
    })
    .where(and(
      eq(stageInstances.workflowInstanceId, input.workflowId),
      inArray(stageInstances.status, ["NOT_STARTED", "ACTIVE", "BLOCKED"]),
    ));
  const [closed] = await transaction
    .update(workflowInstances)
    .set({
      completedAt: withdrawnAt,
      publicStatus: {
        status: "WITHDRAWN",
        label: "Withdrawn",
        description: "This application has been withdrawn.",
      },
      status: "CANCELLED",
      terminalOutcome: "WITHDRAWN",
    })
    .where(and(
      eq(workflowInstances.id, input.workflowId),
      eq(workflowInstances.status, "ACTIVE"),
    ))
    .returning({ id: workflowInstances.id });
  if (!closed) throw new Error("Workflow changed during withdrawal.");
  const [updated] = await transaction
    .update(applications)
    .set({
      rowVersion: input.application.rowVersion + 1,
      status: "withdrawn",
      updatedAt: withdrawnAt,
      withdrawnAt,
    })
    .where(and(
      eq(applications.id, input.application.id),
      eq(applications.status, "submitted"),
      eq(applications.rowVersion, input.application.rowVersion),
    ))
    .returning({ id: applications.id });
  if (!updated) throw new Error("Application changed during withdrawal.");
  await transaction.insert(applicationLifecycleHistory).values({
    actorUserId: input.actorId,
    applicationId: input.application.id,
    occurredAt: withdrawnAt,
    reason: input.reasonCode ?? null,
    resultingRowVersion: input.application.rowVersion + 1,
    sourceRowVersion: input.application.rowVersion,
    sourceStatus: "submitted",
    targetStatus: "withdrawn",
  });
  await transaction.insert(applicationAuditEntries).values({
    action: "APPLICATION_WITHDRAWN",
    actorUserId: input.actorId,
    applicationId: input.application.id,
    correlationId: input.correlationId,
    metadata: { reference: input.application.reference },
  });
  await transaction.insert(workflowEvents).values({
    actorId: input.actorId,
    correlationId: input.correlationId,
    eventCode: "WORKFLOW_WITHDRAWN",
    payload: { applicationId: input.application.id },
    workflowInstanceId: input.workflowId,
  });
  await transaction.insert(workflowAuditEntries).values({
    action: "WORKFLOW_WITHDRAWN",
    actorId: input.actorId,
    after: { status: "CANCELLED", terminalOutcome: "WITHDRAWN" },
    before: { status: "ACTIVE" },
    correlationId: input.correlationId,
    stageInstanceId: input.stageId,
    targetId: input.workflowId,
    targetType: "WORKFLOW_INSTANCE",
    workflowInstanceId: input.workflowId,
  });
  await transaction.insert(workflowAuditEntries).values({
    action: "PUBLIC_STATUS_CHANGED",
    actorId: input.actorId,
    after: {
      status: "WITHDRAWN",
      label: "Withdrawn",
      description: "This application has been withdrawn.",
    },
    before: null,
    correlationId: input.correlationId,
    targetId: input.workflowId,
    targetType: "WORKFLOW_INSTANCE",
    workflowInstanceId: input.workflowId,
  });
  await transaction.insert(workflowEvents).values({
    actorId: input.actorId,
    correlationId: input.correlationId,
    eventCode: "PUBLIC_STATUS_CHANGED",
    payload: {
      status: "WITHDRAWN",
      label: "Withdrawn",
      description: "This application has been withdrawn.",
    },
    workflowInstanceId: input.workflowId,
  });
  await transaction.insert(transactionalOutbox).values({
    aggregateId: input.application.id,
    correlationId: input.correlationId,
    eventCode: "APPLICATION_WITHDRAWN",
    payload: { applicationId: input.application.id, reference: input.application.reference },
    schemaVersion: 1,
  });
  return result;
}
