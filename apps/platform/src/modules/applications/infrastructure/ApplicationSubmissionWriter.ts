import "server-only";

import { and, eq, sql } from "drizzle-orm";

import {
  applications,
  applicationSubmissionCommands,
  transactionalOutbox,
  workflowAuditEntries,
  workflowEvents,
} from "@/db/schema";
import { activateStageInTransaction } from "@/modules/workflows/application/runtime/ServerStageActivationService";
import {
  createAuthoritativeEligibilityOutcomeRecord,
  type AuthoritativeEligibilityOutcomeWrite,
} from "@/modules/eligibility/infrastructure/AuthoritativeEligibilityRepository";
import { createWorkflowInstance } from "@/modules/workflows/infrastructure/WorkflowInstanceRepository";
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
    workflowTemplateVersionId: string;
  };
  correlationId: string;
  eligibilityOutcome: AuthoritativeEligibilityOutcomeWrite;
  idempotencyKey: string;
};

export class InitialStageActivationError extends Error {
  readonly resultKind: string;

  constructor(resultKind: string) {
    super(`Initial workflow stage activation failed: ${resultKind}.`);
    this.name = "InitialStageActivationError";
    this.resultKind = resultKind;
  }
}

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
      workflowVersionId: input.configuration.workflowTemplateVersionId,
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
  const workflow = await createWorkflowInstance(transaction, {
    applicationId: input.application.id,
    startedAt: submittedAt,
    workflowTemplateVersionId:
      input.configuration.workflowTemplateVersionId,
  });
  const workflowPayload = {
    applicationId: input.application.id,
    startedAt: submittedAt.toISOString(),
    workflowTemplateVersionId: input.configuration.workflowTemplateVersionId,
  };
  await transaction.insert(workflowEvents).values({
    actorId: input.actorId,
    correlationId: input.correlationId,
    eventCode: "WORKFLOW_CREATED",
    payload: workflowPayload,
    workflowInstanceId: workflow.id,
  });
  await transaction.insert(workflowAuditEntries).values({
    action: "WORKFLOW_CREATED",
    actorId: input.actorId,
    after: workflowPayload,
    before: null,
    correlationId: input.correlationId,
    targetId: workflow.id,
    targetType: "WORKFLOW_INSTANCE",
    workflowInstanceId: workflow.id,
  });
  const activation = await activateStageInTransaction(transaction, {
    actorId: input.actorId,
    correlationId: input.correlationId,
    iterationNumber: 1,
    stageDefinitionId: input.configuration.stageId,
    workflowInstanceId: workflow.id,
  });
  if (activation.kind !== "activated") {
    throw new InitialStageActivationError(activation.kind);
  }
  return { workflowInstanceId: workflow.id };
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
  await createAuthoritativeEligibilityOutcomeRecord(
    transaction,
    input.eligibilityOutcome,
  );
  const runtime = await createInitialRuntime(transaction, input, submittedAt);
  const result = {
    applicationId: input.application.id,
    reference,
    submittedAt: submittedAt.toISOString(),
    workflowInstanceId: runtime.workflowInstanceId,
    workflowTemplateVersionId:
      input.configuration.workflowTemplateVersionId,
  };
  await appendSubmissionHistory(transaction, input, result);
  return { kind: "submitted", result };
}
