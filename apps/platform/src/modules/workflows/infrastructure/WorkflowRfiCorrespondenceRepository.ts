import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { transactionalOutbox, workflowAuditEntries } from "@/db/schema";
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from "@/lib/resource-errors";
import type {
  AddWorkflowRfiFollowUpInput,
  SaveWorkflowRfiDraftInput,
} from "../domain/runtime/WorkflowRfiSchemas";
import type { WorkflowActionExecutionTransaction } from "./WorkflowActionExecutionRepository";
import {
  workflowRfiCorrespondence,
  workflowRfiDrafts,
  workflowRfis,
} from "./workflow-rfi.schema";
import { workflowTasks } from "./workflow-runtime.schema";

export async function saveOwnedWorkflowRfiDraft(
  transaction: WorkflowActionExecutionTransaction,
  actorId: string,
  input: SaveWorkflowRfiDraftInput,
) {
  const [rfi] = await transaction.select({
    editableFieldPaths: workflowRfis.editableFieldPaths,
  }).from(workflowRfis).where(and(
    eq(workflowRfis.id, input.requestInformationId),
    eq(workflowRfis.recipientUserId, actorId),
    eq(workflowRfis.status, "OPEN"),
  )).for("update", { of: workflowRfis }).limit(1);
  if (!rfi) throw new ResourceNotFoundError("open information request");
  if (
    Object.keys(input.fieldValues).some(
      (path) => !rfi.editableFieldPaths.includes(path),
    )
  ) {
    throw new ResourceConflictError(
      "The draft contains a field that is not editable for this request.",
    );
  }
  const [draft] = await transaction.select({
    rowVersion: workflowRfiDrafts.rowVersion,
  }).from(workflowRfiDrafts).where(and(
    eq(workflowRfiDrafts.rfiId, input.requestInformationId),
    eq(workflowRfiDrafts.respondentUserId, actorId),
  )).for("update").limit(1);
  if ((draft?.rowVersion ?? 0) !== input.expectedRowVersion) {
    throw new ResourceConflictError(
      "This response draft changed. Refresh and reconcile your changes.",
    );
  }
  const now = new Date();
  if (!draft) {
    await transaction.insert(workflowRfiDrafts).values({
      fieldValues: input.fieldValues,
      respondentUserId: actorId,
      rfiId: input.requestInformationId,
      updatedAt: now,
    });
    return { rowVersion: 1, updatedAt: now.toISOString() };
  }
  const [updated] = await transaction.update(workflowRfiDrafts).set({
    fieldValues: input.fieldValues,
    rowVersion: draft.rowVersion + 1,
    updatedAt: now,
  }).where(and(
    eq(workflowRfiDrafts.rfiId, input.requestInformationId),
    eq(workflowRfiDrafts.rowVersion, draft.rowVersion),
  )).returning({ rowVersion: workflowRfiDrafts.rowVersion });
  if (!updated) throw new ResourceConflictError("The response draft changed.");
  return { rowVersion: updated.rowVersion, updatedAt: now.toISOString() };
}

export async function addAssignedWorkflowRfiFollowUp(
  transaction: WorkflowActionExecutionTransaction,
  actorId: string,
  input: AddWorkflowRfiFollowUpInput & { taskId: string },
) {
  const [rfi] = await transaction.select({
    stageInstanceId: workflowRfis.stageInstanceId,
    workflowInstanceId: workflowRfis.workflowInstanceId,
  }).from(workflowRfis).innerJoin(
    workflowTasks,
    and(
      eq(workflowTasks.id, workflowRfis.taskId),
      eq(workflowTasks.id, input.taskId),
      sql`(
        ${workflowTasks.assignedUserId} = ${actorId}::uuid
        OR ${workflowTasks.assignedRoleId} IN (
          SELECT role_id FROM app_user_roles WHERE user_id = ${actorId}::uuid
        )
      )`,
    ),
  ).where(and(
    eq(workflowRfis.id, input.requestInformationId),
    eq(workflowRfis.status, "OPEN"),
  )).for("update", { of: workflowRfis }).limit(1);
  if (!rfi) throw new ResourceNotFoundError("assigned open information request");
  const [entry] = await transaction.insert(workflowRfiCorrespondence).values({
    authorType: "STAFF",
    authorUserId: actorId,
    entryType: "FOLLOW_UP",
    message: input.message,
    rfiId: input.requestInformationId,
  }).returning({ id: workflowRfiCorrespondence.id });
  if (!entry) throw new ResourceConflictError("The follow-up was not saved.");
  const payload = {
    correspondenceId: entry.id,
    requestInformationId: input.requestInformationId,
    taskId: input.taskId,
  };
  await transaction.insert(workflowAuditEntries).values({
    action: "RFI_FOLLOW_UP_ADDED",
    actorId,
    after: payload,
    before: null,
    correlationId: input.correlationId,
    reason: null,
    stageInstanceId: rfi.stageInstanceId,
    targetId: input.requestInformationId,
    targetType: "WORKFLOW_RFI",
    taskId: input.taskId,
    workflowInstanceId: rfi.workflowInstanceId,
  });
  await transaction.insert(transactionalOutbox).values({
    aggregateId: input.requestInformationId,
    correlationId: input.correlationId,
    eventCode: "RFI_FOLLOW_UP_ADDED",
    payload,
    schemaVersion: 1,
  });
  return { correspondenceId: entry.id };
}
