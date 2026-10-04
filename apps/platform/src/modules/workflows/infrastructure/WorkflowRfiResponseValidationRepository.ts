import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from "@/lib/resource-errors";
import type { RespondToWorkflowRfiInput } from "../domain/runtime/WorkflowRfiSchemas";
import { workflowRfiDetailedResponseFieldPath } from "../domain/runtime/WorkflowRfi";
import type { WorkflowActionExecutionTransaction } from "./WorkflowActionExecutionRepository";
import type { WorkflowRfiResponseResult } from "./WorkflowRfiLifecycleRepository";
import { workflowDocumentEvidenceVersions } from "./workflow-evidence.schema";
import {
  workflowRfiDocumentRequests,
  workflowRfiResponses,
  workflowRfis,
} from "./workflow-rfi.schema";
import { workflowRfiInstructionsSummary } from "./WorkflowRfiInstructions";

export async function findResponseReplay(
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
    row.requestInformationId !== input.requestInformationId ||
    row.respondentUserId !== actorId
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

export async function lockOwnedOpenRfi(
  transaction: WorkflowActionExecutionTransaction,
  actorId: string,
  input: RespondToWorkflowRfiInput,
) {
  const [rfi] = await transaction
    .select({
      actionDefinitionId: workflowRfis.actionDefinitionId,
      applicationId: workflowRfis.applicationId,
      deadlineAt: workflowRfis.deadlineAt,
      editableFieldPaths: workflowRfis.editableFieldPaths,
      rowVersion: workflowRfis.rowVersion,
      stageInstanceId: workflowRfis.stageInstanceId,
      taskId: workflowRfis.taskId,
      workflowInstanceId: workflowRfis.workflowInstanceId,
    })
    .from(workflowRfis)
    .where(
      and(
        eq(workflowRfis.id, input.requestInformationId),
        eq(workflowRfis.recipientUserId, actorId),
        eq(workflowRfis.status, "OPEN"),
      ),
    )
    .for("update", { of: workflowRfis })
    .limit(1);
  if (!rfi) throw new ResourceNotFoundError("open information request");
  if (rfi.deadlineAt <= new Date()) {
    throw new ResourceConflictError(
      "The response deadline has passed. This request is locked.",
    );
  }
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
  if (
    rfi.editableFieldPaths.some(
      (path) => !Object.hasOwn(input.fieldValues, path),
    )
  ) {
    throw new ResourceConflictError(
      "Supply every field opened for this request.",
    );
  }
  if (rfi.editableFieldPaths.includes(workflowRfiDetailedResponseFieldPath)) {
    const detailedResponse =
      input.fieldValues[workflowRfiDetailedResponseFieldPath];
    if (
      typeof detailedResponse !== "string" ||
      !workflowRfiInstructionsSummary(detailedResponse)
    ) {
      throw new ResourceConflictError("Enter the requested detailed response.");
    }
  }
  return rfi;
}

export async function assertResponseDocuments(
  transaction: WorkflowActionExecutionTransaction,
  actorId: string,
  applicationId: string,
  input: RespondToWorkflowRfiInput,
) {
  const requests = await transaction
    .select({ requirementId: workflowRfiDocumentRequests.requirementId })
    .from(workflowRfiDocumentRequests)
    .where(eq(workflowRfiDocumentRequests.rfiId, input.requestInformationId));
  if (requests.length !== input.evidenceVersionIds.length) {
    throw new ResourceConflictError(
      "Supply one current document for every requested requirement.",
    );
  }
  if (!requests.length) return;
  const evidence = await transaction
    .select({ requirementId: workflowDocumentEvidenceVersions.requirementId })
    .from(workflowDocumentEvidenceVersions)
    .where(
      and(
        inArray(workflowDocumentEvidenceVersions.id, input.evidenceVersionIds),
        eq(workflowDocumentEvidenceVersions.applicationId, applicationId),
        eq(workflowDocumentEvidenceVersions.uploadedBy, actorId),
        inArray(
          workflowDocumentEvidenceVersions.requirementId,
          requests.map((request) => request.requirementId),
        ),
        sql`(${workflowDocumentEvidenceVersions.validUntil} IS NULL
        OR ${workflowDocumentEvidenceVersions.validUntil} > now())`,
      ),
    );
  if (
    evidence.length !== requests.length ||
    new Set(evidence.map((item) => item.requirementId)).size !== requests.length
  ) {
    throw new ResourceConflictError(
      "Supply one current applicant-uploaded document for every requested requirement.",
    );
  }
}
