import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";

import {
  ResourceConflictError,
  ResourceNotFoundError,
} from "@/lib/resource-errors";
import type {
  CloseWorkflowRfiInput,
  RespondToWorkflowRfiInput,
} from "../domain/runtime/WorkflowRfiSchemas";
import type { WorkflowActionExecutionTransaction } from "./WorkflowActionExecutionRepository";
import { workflowDocumentEvidenceVersions } from "./workflow-evidence.schema";
import { appendWorkflowRfiLifecycleRecords } from "./WorkflowRfiLifecycleRecordsRepository";
import {
  workflowRfiCorrespondence,
  workflowRfiDocumentRequests,
  workflowRfiResponseDocuments,
  workflowRfiResponses,
  workflowRfis,
} from "./workflow-rfi.schema";
import { workflowTasks } from "./workflow-runtime.schema";

export type WorkflowRfiResponseResult = {
  requestInformationId: string;
  responseId: string;
  rowVersion: number;
  status: "RESPONDED";
};

async function findResponseReplay(
  transaction: WorkflowActionExecutionTransaction,
  actorId: string,
  input: RespondToWorkflowRfiInput,
): Promise<WorkflowRfiResponseResult | null> {
  const [row] = await transaction
    .select({
      requestInformationId: workflowRfiResponses.rfiId,
      respondentUserId: workflowRfiResponses.respondentUserId,
      responseId: workflowRfiResponses.id,
    })
    .from(workflowRfiResponses)
    .where(eq(workflowRfiResponses.idempotencyKey, input.idempotencyKey))
    .limit(1);
  if (!row) return null;
  if (
    row.requestInformationId !== input.requestInformationId
    || row.respondentUserId !== actorId
  ) {
    throw new ResourceConflictError(
      "That idempotency key was already used for another RFI response.",
    );
  }
  const [rfi] = await transaction
    .select({ rowVersion: workflowRfis.rowVersion })
    .from(workflowRfis)
    .where(eq(workflowRfis.id, row.requestInformationId))
    .limit(1);
  if (!rfi) throw new ResourceNotFoundError("information request");
  return {
    requestInformationId: row.requestInformationId,
    responseId: row.responseId,
    rowVersion: rfi.rowVersion,
    status: "RESPONDED",
  };
}

async function lockOwnedOpenRfi(
  transaction: WorkflowActionExecutionTransaction,
  actorId: string,
  input: RespondToWorkflowRfiInput,
) {
  const [rfi] = await transaction
    .select({
      applicationId: workflowRfis.applicationId,
      editableFieldPaths: workflowRfis.editableFieldPaths,
      rowVersion: workflowRfis.rowVersion,
      stageInstanceId: workflowRfis.stageInstanceId,
      taskId: workflowRfis.taskId,
      workflowInstanceId: workflowRfis.workflowInstanceId,
    })
    .from(workflowRfis)
    .where(and(
      eq(workflowRfis.id, input.requestInformationId),
      eq(workflowRfis.recipientUserId, actorId),
      eq(workflowRfis.status, "OPEN"),
    ))
    .for("update", { of: workflowRfis })
    .limit(1);
  if (!rfi) throw new ResourceNotFoundError("open information request");
  if (rfi.rowVersion !== input.expectedRowVersion) {
    throw new ResourceConflictError(
      "This information request changed. Refresh and try again.",
    );
  }
  const submittedPaths = Object.keys(input.fieldValues);
  if (submittedPaths.some((path) => !rfi.editableFieldPaths.includes(path))) {
    throw new ResourceConflictError(
      "The response contains a field that is not editable for this request.",
    );
  }
  return rfi;
}

async function assertResponseDocuments(
  transaction: WorkflowActionExecutionTransaction,
  actorId: string,
  applicationId: string,
  input: RespondToWorkflowRfiInput,
) {
  const requests = await transaction
    .select({ requirementId: workflowRfiDocumentRequests.requirementId })
    .from(workflowRfiDocumentRequests)
    .where(eq(
      workflowRfiDocumentRequests.rfiId,
      input.requestInformationId,
    ));
  if (requests.length !== input.evidenceVersionIds.length) {
    throw new ResourceConflictError(
      "Supply one current document for every requested requirement.",
    );
  }
  if (!requests.length) return;
  const evidence = await transaction
    .select({ requirementId: workflowDocumentEvidenceVersions.requirementId })
    .from(workflowDocumentEvidenceVersions)
    .where(and(
      inArray(workflowDocumentEvidenceVersions.id, input.evidenceVersionIds),
      eq(workflowDocumentEvidenceVersions.applicationId, applicationId),
      eq(workflowDocumentEvidenceVersions.uploadedBy, actorId),
      inArray(
        workflowDocumentEvidenceVersions.requirementId,
        requests.map((request) => request.requirementId),
      ),
      sql`(${workflowDocumentEvidenceVersions.validUntil} IS NULL
        OR ${workflowDocumentEvidenceVersions.validUntil} > now())`,
    ));
  if (
    evidence.length !== requests.length
    || new Set(evidence.map((item) => item.requirementId)).size
      !== requests.length
  ) {
    throw new ResourceConflictError(
      "Supply one current applicant-uploaded document for every requested requirement.",
    );
  }
}

export async function respondToOwnedWorkflowRfi(
  transaction: WorkflowActionExecutionTransaction,
  actorId: string,
  input: RespondToWorkflowRfiInput,
): Promise<WorkflowRfiResponseResult> {
  const replay = await findResponseReplay(transaction, actorId, input);
  if (replay) return replay;
  const rfi = await lockOwnedOpenRfi(transaction, actorId, input);
  await assertResponseDocuments(
    transaction,
    actorId,
    rfi.applicationId,
    input,
  );
  const [response] = await transaction.insert(workflowRfiResponses).values({
    correlationId: input.correlationId,
    fieldValues: input.fieldValues,
    idempotencyKey: input.idempotencyKey,
    respondentUserId: actorId,
    rfiId: input.requestInformationId,
  }).returning({ id: workflowRfiResponses.id });
  if (!response) throw new ResourceConflictError("The response was not saved.");
  await transaction.insert(workflowRfiCorrespondence).values({
    authorType: "APPLICANT",
    authorUserId: actorId,
    entryType: "RESPONSE",
    message: "Response submitted.",
    rfiId: input.requestInformationId,
  });
  if (input.evidenceVersionIds.length) {
    await transaction.insert(workflowRfiResponseDocuments).values(
      input.evidenceVersionIds.map((evidenceVersionId) => ({
        evidenceVersionId,
        responseId: response.id,
      })),
    );
  }
  const respondedAt = new Date();
  const [updated] = await transaction.update(workflowRfis).set({
    continuationAppliedAt: respondedAt,
    respondedAt,
    rowVersion: rfi.rowVersion + 1,
    status: "RESPONDED",
    updatedAt: respondedAt,
  }).where(and(
    eq(workflowRfis.id, input.requestInformationId),
    eq(workflowRfis.rowVersion, rfi.rowVersion),
    eq(workflowRfis.status, "OPEN"),
    sql`${workflowRfis.continuationAppliedAt} IS NULL`,
  )).returning({ rowVersion: workflowRfis.rowVersion });
  if (!updated) {
    throw new ResourceConflictError(
      "This information request changed. Refresh and try again.",
    );
  }
  await transaction.update(workflowTasks).set({
    rowVersion: sql`${workflowTasks.rowVersion} + 1`,
  }).where(eq(workflowTasks.id, rfi.taskId));
  await appendWorkflowRfiLifecycleRecords(transaction, {
    actorId,
    correlationId: input.correlationId,
    fromStatus: "OPEN",
    requestInformationId: input.requestInformationId,
    stageInstanceId: rfi.stageInstanceId,
    taskId: rfi.taskId,
    toStatus: "RESPONDED",
    workflowInstanceId: rfi.workflowInstanceId,
  });
  return {
    requestInformationId: input.requestInformationId,
    responseId: response.id,
    rowVersion: updated.rowVersion,
    status: "RESPONDED",
  };
}

export async function closeAssignedWorkflowRfi(
  transaction: WorkflowActionExecutionTransaction,
  actorId: string,
  input: CloseWorkflowRfiInput,
) {
  const [rfi] = await transaction.select({
    rowVersion: workflowRfis.rowVersion,
    stageInstanceId: workflowRfis.stageInstanceId,
    status: workflowRfis.status,
    taskId: workflowRfis.taskId,
    workflowInstanceId: workflowRfis.workflowInstanceId,
  }).from(workflowRfis).innerJoin(
    workflowTasks,
    and(
      eq(workflowTasks.id, workflowRfis.taskId),
      sql`(
        ${workflowTasks.assignedUserId} = ${actorId}::uuid
        OR ${workflowTasks.assignedRoleId} IN (
          SELECT role_id FROM app_user_roles WHERE user_id = ${actorId}::uuid
        )
      )`,
    ),
  ).where(and(
    eq(workflowRfis.id, input.requestInformationId),
    inArray(workflowRfis.status, ["OPEN", "RESPONDED"]),
  )).for("update", { of: workflowRfis }).limit(1);
  if (!rfi) throw new ResourceNotFoundError("assigned information request");
  if (rfi.status !== "OPEN" && rfi.status !== "RESPONDED") {
    throw new ResourceConflictError("The request is already terminal.");
  }
  if (rfi.rowVersion !== input.expectedRowVersion) {
    throw new ResourceConflictError(
      "This information request changed. Refresh and try again.",
    );
  }
  const closedAt = new Date();
  const [updated] = await transaction.update(workflowRfis).set({
    closedAt,
    continuationAppliedAt: sql`COALESCE(
      ${workflowRfis.continuationAppliedAt}, ${closedAt}
    )`,
    rowVersion: rfi.rowVersion + 1,
    status: "CLOSED",
    updatedAt: closedAt,
  }).where(and(
    eq(workflowRfis.id, input.requestInformationId),
    eq(workflowRfis.rowVersion, rfi.rowVersion),
    eq(workflowRfis.status, rfi.status),
  )).returning({ rowVersion: workflowRfis.rowVersion });
  if (!updated) throw new ResourceConflictError("The request changed.");
  await appendWorkflowRfiLifecycleRecords(transaction, {
    actorId,
    correlationId: input.correlationId,
    fromStatus: rfi.status,
    requestInformationId: input.requestInformationId,
    stageInstanceId: rfi.stageInstanceId,
    taskId: rfi.taskId,
    toStatus: "CLOSED",
    workflowInstanceId: rfi.workflowInstanceId,
  });
  return { rowVersion: updated.rowVersion, status: "CLOSED" as const };
}

export async function expireDueWorkflowRfi(
  transaction: WorkflowActionExecutionTransaction,
  input: {
    actorId: string;
    correlationId: string;
    occurredAt: Date;
    requestInformationId: string;
  },
) {
  const [rfi] = await transaction.select({
    deadlineAt: workflowRfis.deadlineAt,
    expiryAction: workflowRfis.expiryAction,
    rowVersion: workflowRfis.rowVersion,
    stageInstanceId: workflowRfis.stageInstanceId,
    taskId: workflowRfis.taskId,
    workflowInstanceId: workflowRfis.workflowInstanceId,
  }).from(workflowRfis).where(and(
    eq(workflowRfis.id, input.requestInformationId),
    eq(workflowRfis.status, "OPEN"),
    sql`${workflowRfis.deadlineAt} <= ${input.occurredAt}`,
  )).for("update", { of: workflowRfis }).limit(1);
  if (!rfi) throw new ResourceNotFoundError("due information request");
  const [updated] = await transaction.update(workflowRfis).set({
    continuationAppliedAt: input.occurredAt,
    expiredAt: input.occurredAt,
    rowVersion: rfi.rowVersion + 1,
    status: "EXPIRED",
    updatedAt: input.occurredAt,
  }).where(and(
    eq(workflowRfis.id, input.requestInformationId),
    eq(workflowRfis.rowVersion, rfi.rowVersion),
    eq(workflowRfis.status, "OPEN"),
    sql`${workflowRfis.continuationAppliedAt} IS NULL`,
  )).returning({ rowVersion: workflowRfis.rowVersion });
  if (!updated) throw new ResourceConflictError("The request changed.");
  await transaction.update(workflowTasks).set({
    rowVersion: sql`${workflowTasks.rowVersion} + 1`,
  }).where(eq(workflowTasks.id, rfi.taskId));
  await appendWorkflowRfiLifecycleRecords(transaction, {
    actorId: input.actorId,
    correlationId: input.correlationId,
    details: { expiryAction: rfi.expiryAction },
    fromStatus: "OPEN",
    requestInformationId: input.requestInformationId,
    stageInstanceId: rfi.stageInstanceId,
    taskId: rfi.taskId,
    toStatus: "EXPIRED",
    workflowInstanceId: rfi.workflowInstanceId,
  });
  return {
    expiryAction: rfi.expiryAction,
    rowVersion: updated.rowVersion,
    status: "EXPIRED" as const,
  };
}
