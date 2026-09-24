import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";

import {
  applicationAuditEntries,
  applicationLifecycleHistory,
  applications,
  applicationSubmissionCommands,
  transactionalOutbox,
  workflowAuditEntries,
  workflowEvents,
} from "@/db/schema";
import { activateStageInTransaction } from "@/modules/workflows/application/runtime/ServerStageActivationService";
import { createWorkflowInstance } from "@/modules/workflows/infrastructure/WorkflowInstanceRepository";
import { formatApplicationReference } from "../domain/ApplicationReference";
import type {
  SubmissionResult,
  SubmissionTransaction,
  SubmitApplicationResult,
} from "./ApplicationSubmissionRepository";
import type { validateApplicationSubmissionState } from "./ApplicationSubmissionValidation";
import { createSubmissionSnapshot } from "./ApplicationSubmissionSnapshotWriter";

type ValidatedState = NonNullable<Awaited<ReturnType<
  typeof validateApplicationSubmissionState
>>>;

export type SubmissionWriteInput = {
  actorId: string;
  applicant: NonNullable<ValidatedState["applicant"]>;
  application: ValidatedState["application"];
  business: NonNullable<ValidatedState["business"]>;
  configuration: NonNullable<ValidatedState["configuration"]>;
  context: NonNullable<ValidatedState["context"]>;
  correlationId: string;
  idempotencyKey: string;
  publicationRevision: NonNullable<ValidatedState["publicationRevision"]>;
  requestFingerprint: string;
};

export class InitialStageActivationError extends Error {
  readonly resultKind: string;

  constructor(resultKind: string) {
    super(`Initial workflow stage activation failed: ${resultKind}.`);
    this.name = "InitialStageActivationError";
    this.resultKind = resultKind;
  }
}

async function allocateReference(
  transaction: SubmissionTransaction,
  input: SubmissionWriteInput,
  submittedAt: Date,
) {
  const allocation = await transaction.execute<{ value: string }>(sql`
    SELECT nextval('app_application_reference_seq')::text AS value
  `);
  return formatApplicationReference({
    fundingCallReference: input.configuration.reference,
    sequenceValue: BigInt(allocation.rows[0]!.value),
    submittedAt,
  });
}

async function markApplicationSubmitted(
  transaction: SubmissionTransaction,
  input: SubmissionWriteInput,
  reference: string,
  snapshotId: string,
  submittedAt: Date,
) {
  const [updated] = await transaction
    .update(applications)
    .set({
      reference,
      rowVersion: input.application.rowVersion + 1,
      status: "submitted",
      submissionSnapshotId: snapshotId,
      submittedAt,
      updatedAt: submittedAt,
    })
    .where(and(
      eq(applications.id, input.application.id),
      eq(applications.status, "draft"),
      isNull(applications.deletedAt),
      eq(applications.rowVersion, input.application.rowVersion),
    ))
    .returning({ id: applications.id });
  return Boolean(updated);
}

async function createInitialRuntime(
  transaction: SubmissionTransaction,
  input: SubmissionWriteInput,
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
  return workflow.id;
}

async function appendSubmissionRecords(
  transaction: SubmissionTransaction,
  input: SubmissionWriteInput,
  result: SubmissionResult,
  snapshot: { id: string; integrityHash: string },
) {
  await transaction.insert(applicationLifecycleHistory).values({
    actorUserId: input.actorId,
    applicationId: input.application.id,
    occurredAt: new Date(result.submittedAt),
    resultingRowVersion: input.application.rowVersion + 1,
    sourceRowVersion: input.application.rowVersion,
    sourceStatus: "draft",
    targetStatus: "submitted",
  });
  await transaction.insert(applicationAuditEntries).values([
    {
      action: "APPLICATION_REFERENCE_ALLOCATED",
      actorUserId: input.actorId,
      applicationId: input.application.id,
      correlationId: input.correlationId,
      metadata: { reference: result.reference },
    },
    {
      action: "APPLICATION_SNAPSHOT_CREATED",
      actorUserId: input.actorId,
      applicationId: input.application.id,
      correlationId: input.correlationId,
      metadata: {
        integrityHash: snapshot.integrityHash,
        snapshotId: snapshot.id,
      },
    },
    {
      action: "APPLICATION_WORKFLOW_BOOTSTRAPPED",
      actorUserId: input.actorId,
      applicationId: input.application.id,
      correlationId: input.correlationId,
      metadata: {
        workflowInstanceId: result.workflowInstanceId,
        workflowTemplateVersionId: result.workflowTemplateVersionId,
      },
    },
  ]);
  await transaction.insert(applicationAuditEntries).values({
    action: "APPLICATION_SUBMITTED",
    actorUserId: input.actorId,
    applicationId: input.application.id,
    correlationId: input.correlationId,
    metadata: {
      reference: result.reference,
      submittedAt: result.submittedAt,
      workflowInstanceId: result.workflowInstanceId,
    },
  });
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
  await transaction.insert(transactionalOutbox).values([
    {
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
    },
    {
      aggregateId: input.application.id,
      correlationId: input.correlationId,
      eventCode: "APPLICATION_SUBMISSION_PDF_REQUESTED",
      payload: {
        applicationId: input.application.id,
        reference: result.reference,
      },
      schemaVersion: 1,
    },
  ]);
  await transaction.insert(applicationSubmissionCommands).values({
    applicationId: input.application.id,
    idempotencyKey: input.idempotencyKey,
    reference: result.reference,
    requestFingerprint: input.requestFingerprint,
    submittedAt: new Date(result.submittedAt),
    workflowInstanceId: result.workflowInstanceId,
  });
}

export async function writeApplicationSubmission(
  transaction: SubmissionTransaction,
  input: SubmissionWriteInput,
): Promise<SubmitApplicationResult> {
  const submittedAt = new Date();
  const reference = await allocateReference(transaction, input, submittedAt);
  const snapshot = await createSubmissionSnapshot(
    transaction,
    input,
    reference,
    submittedAt,
  );
  const updated = await markApplicationSubmitted(
    transaction,
    input,
    reference,
    snapshot.id,
    submittedAt,
  );
  if (!updated) return { kind: "stale_preflight" };
  const workflowInstanceId = await createInitialRuntime(
    transaction,
    input,
    submittedAt,
  );
  const result = {
    applicationId: input.application.id,
    reference,
    submittedAt: submittedAt.toISOString(),
    workflowInstanceId,
    workflowTemplateVersionId:
      input.configuration.workflowTemplateVersionId,
  };
  await appendSubmissionRecords(transaction, input, result, snapshot);
  return { kind: "submitted", result };
}
