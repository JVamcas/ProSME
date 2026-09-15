import "server-only";

import { and, eq, sql } from "drizzle-orm";

import {
  applications,
  applicationSubmissionCommands,
  stageTaskDefinitions,
  stageTaskInstances,
  transactionalOutbox,
  workflowAuditEntries,
  workflowEvents,
  workflowInstances,
  workflowStageInstances,
} from "@/db/schema";
import type {
  SubmissionResult,
  SubmissionTransaction,
  SubmitApplicationResult,
} from "./ApplicationSubmissionRepository";

type WriteInput = {
  actorId: string;
  application: typeof applications.$inferSelect;
  applicationId: string;
  configuration: {
    stageId: string;
    slaHours: number | null;
    workflowVersionId: string;
  };
  correlationId: string;
  idempotencyKey: string;
};

async function markApplicationSubmitted(
  transaction: SubmissionTransaction,
  input: WriteInput,
  submittedAt: Date,
) {
  const [updated] = await transaction
    .update(applications)
    .set({
      reference: sql<string>`'SMEF-' || to_char(CURRENT_TIMESTAMP AT TIME ZONE 'UTC', 'YYYY') || '-' || lpad(nextval('app_application_reference_seq')::text, 6, '0')`,
      rowVersion: input.application.rowVersion + 1,
      status: "submitted",
      submittedAt,
      updatedAt: submittedAt,
      workflowVersionId: input.configuration.workflowVersionId,
    })
    .where(and(
      eq(applications.id, input.application.id),
      eq(applications.status, "draft"),
    ))
    .returning({ reference: applications.reference });
  return updated?.reference ?? null;
}

async function createInitialRuntime(
  transaction: SubmissionTransaction,
  input: WriteInput,
  submittedAt: Date,
) {
  const [workflow] = await transaction
    .insert(workflowInstances)
    .values({
      applicationId: input.application.id,
      startedAt: submittedAt,
      workflowVersionId: input.configuration.workflowVersionId,
    })
    .returning({ id: workflowInstances.id });
  const [stage] = await transaction
    .insert(workflowStageInstances)
    .values({
      stageDefinitionId: input.configuration.stageId,
      startedAt: submittedAt,
      workflowInstanceId: workflow.id,
    })
    .returning({ id: workflowStageInstances.id });
  await transaction
    .update(workflowInstances)
    .set({ currentStageInstanceId: stage.id })
    .where(eq(workflowInstances.id, workflow.id));
  return { stageId: stage.id, workflowInstanceId: workflow.id };
}

async function createInitialTasks(
  transaction: SubmissionTransaction,
  input: WriteInput,
  stageInstanceId: string,
  submittedAt: Date,
) {
  const definitions = await transaction
    .select()
    .from(stageTaskDefinitions)
    .where(eq(stageTaskDefinitions.stageId, input.configuration.stageId));
  if (!definitions.length) return;
  const dueAt = input.configuration.slaHours === null
    ? null
    : new Date(
        submittedAt.getTime() + input.configuration.slaHours * 3_600_000,
      );
  await transaction.insert(stageTaskInstances).values(
    definitions.map((task) => ({
      assignmentRoleId: task.assignmentRoleId,
      assignmentUserId: task.assignmentUserId,
      dueAt,
      stageInstanceId,
      taskDefinitionId: task.id,
      typeSnapshot: task.type,
    })),
  );
}

async function appendSubmissionHistory(
  transaction: SubmissionTransaction,
  input: WriteInput,
  result: SubmissionResult,
) {
  await transaction.insert(workflowEvents).values({
    actorId: input.actorId,
    correlationId: input.correlationId,
    eventCode: "APPLICATION_SUBMITTED",
    payload: { applicationId: input.application.id, reference: result.reference },
    workflowInstanceId: result.workflowInstanceId,
  });
  await transaction.insert(workflowAuditEntries).values({
    action: "APPLICATION_SUBMITTED",
    actorId: input.actorId,
    after: result,
    before: { status: "draft" },
    correlationId: input.correlationId,
    idempotencyKey: input.idempotencyKey,
    targetId: input.application.id,
    targetType: "APPLICATION",
  });
  await transaction.insert(transactionalOutbox).values({
    aggregateId: input.application.id,
    correlationId: input.correlationId,
    eventCode: "APPLICATION_SUBMISSION_CONFIRMATION_REQUESTED",
    payload: {
      applicationId: input.application.id,
      ownerUserId: input.actorId,
      reference: result.reference,
      submittedAt: result.submittedAt,
    },
    schemaVersion: 1,
  });
  await transaction.insert(applicationSubmissionCommands).values({
    applicationId: input.application.id,
    idempotencyKey: input.idempotencyKey,
    reference: result.reference,
    submittedAt: new Date(result.submittedAt),
    workflowInstanceId: result.workflowInstanceId,
  });
}

export async function writeApplicationSubmission(
  transaction: SubmissionTransaction,
  input: WriteInput,
): Promise<SubmitApplicationResult> {
  const submittedAt = new Date();
  const reference = await markApplicationSubmitted(
    transaction,
    input,
    submittedAt,
  );
  if (!reference) return { kind: "idempotency_conflict" };
  const runtime = await createInitialRuntime(transaction, input, submittedAt);
  await createInitialTasks(transaction, input, runtime.stageId, submittedAt);
  const result = {
    applicationId: input.application.id,
    reference,
    submittedAt: submittedAt.toISOString(),
    workflowInstanceId: runtime.workflowInstanceId,
    workflowVersionId: input.configuration.workflowVersionId,
  };
  await appendSubmissionHistory(transaction, input, result);
  return { kind: "submitted", result };
}
