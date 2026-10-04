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
import { workflowRfiDetailedResponseFieldPath } from "../domain/runtime/WorkflowRfi";
import { applyWorkflowRfiApplicationCorrections } from "@/modules/applications/infrastructure/ApplicationRfiCorrectionRepository";
import type { WorkflowActionExecutionTransaction } from "./WorkflowActionExecutionRepository";
import { appendWorkflowRfiLifecycleRecords } from "./WorkflowRfiLifecycleRecordsRepository";
import {
  workflowRfiCorrespondence,
  workflowRfiResponseDocuments,
  workflowRfiResponses,
  workflowRfis,
} from "./workflow-rfi.schema";
import { workflowTasks } from "./workflow-runtime.schema";
import {
  findResponseReplay,
  lockOwnedOpenRfi,
  assertResponseDocuments,
} from "./WorkflowRfiResponseValidationRepository";
import { sanitizeWorkflowRfiRichText } from "./WorkflowRfiInstructions";

export type WorkflowRfiResponseResult = {
  requestInformationId: string;
  responseId: string;
  rowVersion: number;
  status: "RESPONDED";
};

export async function respondToOwnedWorkflowRfi(
  transaction: WorkflowActionExecutionTransaction,
  actorId: string,
  input: RespondToWorkflowRfiInput,
): Promise<WorkflowRfiResponseResult> {
  const replay = await findResponseReplay(transaction, actorId, input);
  if (replay) return replay;
  const rfi = await lockOwnedOpenRfi(transaction, actorId, input);
  await assertResponseDocuments(transaction, actorId, rfi.applicationId, input);
  const detailedResponse =
    input.fieldValues[workflowRfiDetailedResponseFieldPath];
  const fieldValues = {
    ...input.fieldValues,
    ...(typeof detailedResponse === "string"
      ? {
          [workflowRfiDetailedResponseFieldPath]:
            sanitizeWorkflowRfiRichText(detailedResponse),
        }
      : {}),
  };
  const corrections = await applyWorkflowRfiApplicationCorrections(
    transaction,
    {
      actorId,
      applicationId: rfi.applicationId,
      fieldValues: Object.fromEntries(
        Object.entries(fieldValues).filter(
          ([path]) => path !== workflowRfiDetailedResponseFieldPath,
        ),
      ),
    },
  );
  if (corrections) Object.assign(fieldValues, corrections.after);
  const respondedAt = new Date();
  const [response] = await transaction
    .insert(workflowRfiResponses)
    .values({
      correlationId: input.correlationId,
      fieldValues,
      idempotencyKey: input.idempotencyKey,
      respondentUserId: actorId,
      respondedAt,
      rfiId: input.requestInformationId,
    })
    .returning({ id: workflowRfiResponses.id });
  if (!response) throw new ResourceConflictError("The response was not saved.");
  await transaction.insert(workflowRfiCorrespondence).values({
    authorType: "APPLICANT",
    authorUserId: actorId,
    entryType: "RESPONSE",
    message: "Response submitted.",
    rfiId: input.requestInformationId,
    createdAt: respondedAt,
  });
  if (input.evidenceVersionIds.length) {
    await transaction.insert(workflowRfiResponseDocuments).values(
      input.evidenceVersionIds.map((evidenceVersionId) => ({
        evidenceVersionId,
        responseId: response.id,
      })),
    );
  }
  const [updated] = await transaction
    .update(workflowRfis)
    .set({
      continuationAppliedAt: respondedAt,
      respondedAt,
      rowVersion: rfi.rowVersion + 1,
      status: "RESPONDED",
      updatedAt: respondedAt,
    })
    .where(
      and(
        eq(workflowRfis.id, input.requestInformationId),
        eq(workflowRfis.rowVersion, rfi.rowVersion),
        eq(workflowRfis.status, "OPEN"),
        sql`${workflowRfis.deadlineAt} > ${respondedAt}`,
        sql`${workflowRfis.continuationAppliedAt} IS NULL`,
      ),
    )
    .returning({ rowVersion: workflowRfis.rowVersion });
  if (!updated) {
    throw new ResourceConflictError(
      "This information request changed. Refresh and try again.",
    );
  }
  await transaction
    .update(workflowTasks)
    .set({
      rowVersion: sql`${workflowTasks.rowVersion} + 1`,
    })
    .where(eq(workflowTasks.id, rfi.taskId));
  await appendWorkflowRfiLifecycleRecords(transaction, {
    actorId,
    correlationId: input.correlationId,
    details: corrections
      ? { applicationFieldCorrections: corrections }
      : undefined,
    fromStatus: "OPEN",
    nextRowVersion: updated.rowVersion,
    occurredAt: respondedAt,
    previousRowVersion: rfi.rowVersion,
    requestInformationId: input.requestInformationId,
    source: {
      actionDefinitionId: rfi.actionDefinitionId,
      applicationId: rfi.applicationId,
      stageInstanceId: rfi.stageInstanceId,
      taskId: rfi.taskId,
      workflowInstanceId: rfi.workflowInstanceId,
    },
    toStatus: "RESPONDED",
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
  const [rfi] = await transaction
    .select({
      actionDefinitionId: workflowRfis.actionDefinitionId,
      applicationId: workflowRfis.applicationId,
      rowVersion: workflowRfis.rowVersion,
      stageInstanceId: workflowRfis.stageInstanceId,
      status: workflowRfis.status,
      taskId: workflowRfis.taskId,
      workflowInstanceId: workflowRfis.workflowInstanceId,
    })
    .from(workflowRfis)
    .innerJoin(
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
    )
    .where(
      and(
        eq(workflowRfis.id, input.requestInformationId),
        inArray(workflowRfis.status, ["OPEN", "RESPONDED"]),
      ),
    )
    .for("update", { of: workflowRfis })
    .limit(1);
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
  const [updated] = await transaction
    .update(workflowRfis)
    .set({
      closedAt,
      continuationAppliedAt: sql`COALESCE(
      ${workflowRfis.continuationAppliedAt}, least(${workflowRfis.deadlineAt}, ${closedAt})
    )`,
      rowVersion: rfi.rowVersion + 1,
      status: "CLOSED",
      updatedAt: closedAt,
    })
    .where(
      and(
        eq(workflowRfis.id, input.requestInformationId),
        eq(workflowRfis.rowVersion, rfi.rowVersion),
        eq(workflowRfis.status, rfi.status),
      ),
    )
    .returning({ rowVersion: workflowRfis.rowVersion });
  if (!updated) throw new ResourceConflictError("The request changed.");
  await appendWorkflowRfiLifecycleRecords(transaction, {
    actorId,
    correlationId: input.correlationId,
    fromStatus: rfi.status,
    nextRowVersion: updated.rowVersion,
    occurredAt: closedAt,
    previousRowVersion: rfi.rowVersion,
    requestInformationId: input.requestInformationId,
    source: {
      actionDefinitionId: rfi.actionDefinitionId,
      applicationId: rfi.applicationId,
      stageInstanceId: rfi.stageInstanceId,
      taskId: rfi.taskId,
      workflowInstanceId: rfi.workflowInstanceId,
    },
    toStatus: "CLOSED",
  });
  return { rowVersion: updated.rowVersion, status: "CLOSED" as const };
}

export async function expireDueWorkflowRfi(
  transaction: WorkflowActionExecutionTransaction,
  input: {
    actorId: string;
    actorType?: "USER" | "SYSTEM";
    correlationId: string;
    occurredAt: Date;
    requestInformationId: string;
  },
) {
  const [rfi] = await transaction
    .select({
      actionDefinitionId: workflowRfis.actionDefinitionId,
      applicationId: workflowRfis.applicationId,
      deadlineAt: workflowRfis.deadlineAt,
      expiryAction: workflowRfis.expiryAction,
      rowVersion: workflowRfis.rowVersion,
      stageInstanceId: workflowRfis.stageInstanceId,
      taskId: workflowRfis.taskId,
      workflowInstanceId: workflowRfis.workflowInstanceId,
    })
    .from(workflowRfis)
    .where(
      and(
        eq(workflowRfis.id, input.requestInformationId),
        eq(workflowRfis.status, "OPEN"),
        sql`${workflowRfis.deadlineAt} <= ${input.occurredAt}`,
      ),
    )
    .for("update", { of: workflowRfis })
    .limit(1);
  if (!rfi) throw new ResourceNotFoundError("due information request");
  const [updated] = await transaction
    .update(workflowRfis)
    .set({
      continuationAppliedAt: sql`${workflowRfis.deadlineAt}`,
      expiredAt: input.occurredAt,
      rowVersion: rfi.rowVersion + 1,
      status: "EXPIRED",
      updatedAt: input.occurredAt,
    })
    .where(
      and(
        eq(workflowRfis.id, input.requestInformationId),
        eq(workflowRfis.rowVersion, rfi.rowVersion),
        eq(workflowRfis.status, "OPEN"),
        sql`${workflowRfis.continuationAppliedAt} IS NULL`,
      ),
    )
    .returning({ rowVersion: workflowRfis.rowVersion });
  if (!updated) throw new ResourceConflictError("The request changed.");
  await transaction
    .update(workflowTasks)
    .set({
      rowVersion: sql`${workflowTasks.rowVersion} + 1`,
    })
    .where(eq(workflowTasks.id, rfi.taskId));
  await appendWorkflowRfiLifecycleRecords(transaction, {
    actorId: input.actorId,
    correlationId: input.correlationId,
    details: { expiryAction: rfi.expiryAction },
    actorType: input.actorType,
    fromStatus: "OPEN",
    nextRowVersion: updated.rowVersion,
    occurredAt: input.occurredAt,
    previousRowVersion: rfi.rowVersion,
    requestInformationId: input.requestInformationId,
    source: {
      actionDefinitionId: rfi.actionDefinitionId,
      applicationId: rfi.applicationId,
      stageInstanceId: rfi.stageInstanceId,
      taskId: rfi.taskId,
      workflowInstanceId: rfi.workflowInstanceId,
    },
    toStatus: "EXPIRED",
  });
  return {
    expiryAction: rfi.expiryAction,
    rowVersion: updated.rowVersion,
    status: "EXPIRED" as const,
  };
}
