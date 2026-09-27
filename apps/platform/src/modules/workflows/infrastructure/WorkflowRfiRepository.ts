import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";

import { ResourceConflictError } from "@/lib/resource-errors";
import { applications } from "@/db/schema";
import type {
  CreateWorkflowRfiRequest,
  CreateWorkflowRfiResult,
} from "../domain/runtime/WorkflowRfi";
import type { WorkflowActionExecutionTransaction } from "./WorkflowActionExecutionRepository";
import { appendWorkflowRfiCreationRecords } from "./WorkflowRfiCreationRecordsRepository";
import {
  workflowRfiDocumentRequests,
  workflowRfiCorrespondence,
  workflowRfiParticipants,
  workflowRfis,
} from "./workflow-rfi.schema";
import { workflowStageDocumentRequirements } from "./workflow-stage-requirements.schema";
import {
  workflowActionDefinitions,
  stageTaskActionBindings,
} from "./workflow.schema";
import {
  stageInstances,
  workflowInstances,
  workflowTasks,
} from "./workflow-runtime.schema";

type CreationTarget = {
  recipientUserId: string;
  taskDefinitionId: string;
};

async function findCreationReplay(
  transaction: WorkflowActionExecutionTransaction,
  request: CreateWorkflowRfiRequest,
): Promise<CreateWorkflowRfiResult | null> {
  const [row] = await transaction
    .select({
      deadlineAt: workflowRfis.deadlineAt,
      id: workflowRfis.id,
      requesterId: workflowRfis.requesterId,
      taskId: workflowRfis.taskId,
    })
    .from(workflowRfis)
    .where(eq(workflowRfis.idempotencyKey, request.idempotencyKey))
    .limit(1);
  if (!row) return null;
  if (
    row.requesterId !== request.requesterId
    || row.taskId !== request.source.taskId
  ) {
    throw new ResourceConflictError(
      "That idempotency key was already used for another information request.",
    );
  }
  return {
    deadlineAt: row.deadlineAt,
    requestInformationId: row.id,
    status: "OPEN",
  };
}

async function lockCreationTarget(
  transaction: WorkflowActionExecutionTransaction,
  request: CreateWorkflowRfiRequest,
): Promise<CreationTarget> {
  const [target] = await transaction
    .select({
      recipientUserId: applications.ownerUserId,
      taskDefinitionId: workflowTasks.workflowTaskDefinitionId,
    })
    .from(workflowTasks)
    .innerJoin(
      stageInstances,
      and(
        eq(stageInstances.id, workflowTasks.stageInstanceId),
        eq(stageInstances.id, request.source.stageInstanceId),
        eq(
          stageInstances.workflowStageDefinitionId,
          request.source.stageDefinitionId,
        ),
      ),
    )
    .innerJoin(
      workflowInstances,
      and(
        eq(workflowInstances.id, stageInstances.workflowInstanceId),
        eq(workflowInstances.id, request.source.workflowInstanceId),
        eq(workflowInstances.applicationId, request.applicationId),
        eq(
          workflowInstances.workflowTemplateVersionId,
          request.source.workflowVersionId,
        ),
      ),
    )
    .innerJoin(applications, eq(applications.id, workflowInstances.applicationId))
    .innerJoin(
      stageTaskActionBindings,
      eq(
        stageTaskActionBindings.taskDefinitionId,
        workflowTasks.workflowTaskDefinitionId,
      ),
    )
    .innerJoin(
      workflowActionDefinitions,
      and(
        eq(workflowActionDefinitions.id, request.source.actionDefinitionId),
        eq(
          workflowActionDefinitions.stableKey,
          stageTaskActionBindings.actionKey,
        ),
        eq(workflowActionDefinitions.actionType, "REQUEST_INFORMATION"),
        eq(workflowActionDefinitions.enabled, true),
      ),
    )
    .where(eq(workflowTasks.id, request.source.taskId))
    .for("update", { of: workflowTasks })
    .limit(1);
  if (!target) {
    throw new ResourceConflictError(
      "The information request is not valid for this workflow task.",
    );
  }
  return target;
}

async function assertRequestedDocuments(
  transaction: WorkflowActionExecutionTransaction,
  request: CreateWorkflowRfiRequest,
  taskDefinitionId: string,
) {
  const requirementIds = [...request.requestedDocumentRequirementIds];
  if (!requirementIds.length) return;
  const rows = await transaction
    .select({ id: workflowStageDocumentRequirements.id })
    .from(workflowStageDocumentRequirements)
    .where(and(
      inArray(workflowStageDocumentRequirements.id, requirementIds),
      eq(workflowStageDocumentRequirements.taskDefinitionId, taskDefinitionId),
      eq(workflowStageDocumentRequirements.uploader, "APPLICANT"),
      sql`NOT EXISTS (
        SELECT 1 FROM app_workflow_document_evidence_versions evidence
        WHERE evidence.application_id = ${request.applicationId}::uuid
          AND evidence.requirement_id = ${workflowStageDocumentRequirements.id}
          AND (evidence.valid_until IS NULL OR evidence.valid_until > now())
      )`,
    ));
  if (rows.length !== requirementIds.length) {
    throw new ResourceConflictError(
      "Requested documents must be missing applicant-owned requirements on this task.",
    );
  }
}

export async function createWorkflowRfi(
  transaction: WorkflowActionExecutionTransaction,
  request: CreateWorkflowRfiRequest,
): Promise<CreateWorkflowRfiResult> {
  const replay = await findCreationReplay(transaction, request);
  if (replay) return replay;
  const target = await lockCreationTarget(transaction, request);
  await assertRequestedDocuments(transaction, request, target.taskDefinitionId);
  const occurredAt = new Date();
  const deadlineAt = new Date(
    occurredAt.getTime() + request.deadline.days * 24 * 60 * 60 * 1_000,
  );
  const [rfi] = await transaction.insert(workflowRfis).values({
    actionDefinitionId: request.source.actionDefinitionId,
    applicationId: request.applicationId,
    continuationBehavior: request.continuation.behavior,
    correlationId: request.correlationId,
    createdAt: occurredAt,
    deadlineAt,
    editableFieldPaths: [...request.editableFieldPaths],
    expiryAction: request.deadline.expiryAction,
    idempotencyKey: request.idempotencyKey,
    initiationType: request.initiationType,
    instructions: request.instructions,
    question: request.question,
    recipientUserId: target.recipientUserId,
    reminderDayOffsets: [...request.deadline.reminderDayOffsets],
    requesterId: request.requesterId,
    stageInstanceId: request.source.stageInstanceId,
    taskId: request.source.taskId,
    updatedAt: occurredAt,
    workflowInstanceId: request.source.workflowInstanceId,
  }).returning({ id: workflowRfis.id });
  if (!rfi) throw new ResourceConflictError("The information request changed.");
  await transaction.insert(workflowRfiParticipants).values([
    {
      participantType: "RECIPIENT",
      rfiId: rfi.id,
      userId: target.recipientUserId,
    },
    {
      participantType: "REQUESTER",
      rfiId: rfi.id,
      userId: request.requesterId,
    },
  ]);
  if (request.requestedDocumentRequirementIds.length) {
    await transaction.insert(workflowRfiDocumentRequests).values(
      request.requestedDocumentRequirementIds.map((requirementId) => ({
        requirementId,
        rfiId: rfi.id,
      })),
    );
  }
  await transaction.insert(workflowRfiCorrespondence).values({
    authorType: "STAFF",
    authorUserId: request.requesterId,
    entryType: "REQUEST",
    message: request.question,
    rfiId: rfi.id,
    createdAt: occurredAt,
  });
  const result: CreateWorkflowRfiResult = {
    deadlineAt,
    requestInformationId: rfi.id,
    status: "OPEN",
  };
  await appendWorkflowRfiCreationRecords(
    transaction,
    request,
    result,
    occurredAt,
  );
  return result;
}

type AutomaticRfiRow = {
  actionDefinitionId: string;
  actionKey: string;
  applicationId: string;
  configuration: {
    continuation: "RESUME_SOURCE_TASK";
    deadlineDays: number;
    editableFieldPaths: string[];
    expiryAction: "CLOSE_REQUEST" | "ESCALATE" | "RETURN";
    participantScope: "APPLICATION_OWNER_AND_REQUESTER";
    recipientScope: "APPLICATION_OWNER";
    reminderDayOffsets: number[];
  };
  requirementId: string;
  requirementName: string;
  stageKey: string;
  taskId: string;
  workflowVersionId: string;
};

export async function createStageActivationWorkflowRfi(
  transaction: WorkflowActionExecutionTransaction,
  input: {
    actorId: string;
    correlationId: string;
    stageDefinitionId: string;
    stageInstanceId: string;
    workflowInstanceId: string;
  },
) {
  const result = await transaction.execute(sql`
    SELECT requirement.id AS "requirementId",
      requirement.name AS "requirementName",
      task.id AS "taskId",
      action.id AS "actionDefinitionId",
      action.stable_key AS "actionKey",
      action.configuration,
      stage_definition.code AS "stageKey",
      workflow.application_id AS "applicationId",
      workflow.workflow_template_version_id AS "workflowVersionId"
    FROM app_workflow_stage_document_requirements requirement
    JOIN app_workflow_tasks task
      ON task.workflow_task_definition_id = requirement.task_definition_id
      AND task.stage_instance_id = ${input.stageInstanceId}::uuid
      AND task.reviewer_slot = 1
    JOIN app_workflow_stage_definitions stage_definition
      ON stage_definition.id = requirement.stage_id
    JOIN app_workflow_instances workflow
      ON workflow.id = ${input.workflowInstanceId}::uuid
    JOIN LATERAL (
      SELECT candidate.id, candidate.stable_key, candidate.configuration
      FROM app_stage_task_action_bindings binding
      JOIN app_workflow_action_definitions candidate
        ON candidate.stage_id = binding.stage_id
        AND candidate.stable_key = binding.action_key
      WHERE binding.task_definition_id = requirement.task_definition_id
        AND candidate.action_type = 'REQUEST_INFORMATION'
        AND candidate.enabled = true
      ORDER BY candidate.display_order, candidate.id
      LIMIT 1
    ) action ON true
    WHERE requirement.stage_id = ${input.stageDefinitionId}::uuid
      AND requirement.request_on_stage_activation = true
      AND requirement.uploader = 'APPLICANT'
      AND NOT EXISTS (
        SELECT 1 FROM app_workflow_document_evidence_versions evidence
        WHERE evidence.application_id = workflow.application_id
          AND evidence.requirement_id = requirement.id
          AND (evidence.valid_until IS NULL OR evidence.valid_until > now())
      )
    ORDER BY requirement.name, requirement.id
  `);
  const rows = result.rows as AutomaticRfiRow[];
  const first = rows[0];
  if (!first) return null;
  if (rows.some((row) => row.taskId !== first.taskId)) {
    throw new ResourceConflictError(
      "Automatically requested documents must be consolidated on one task.",
    );
  }
  return createWorkflowRfi(transaction, {
    applicationId: first.applicationId,
    continuation: {
      behavior: first.configuration.continuation,
      sourceStageInstanceId: input.stageInstanceId,
      sourceTaskId: first.taskId,
    },
    correlationId: input.correlationId,
    deadline: {
      days: first.configuration.deadlineDays,
      expiryAction: first.configuration.expiryAction,
      reminderDayOffsets: first.configuration.reminderDayOffsets,
    },
    editableFieldPaths: first.configuration.editableFieldPaths,
    idempotencyKey: `AUTO_RFI:${input.stageInstanceId}`,
    initiationType: "STAGE_ACTIVATION",
    instructions: "Upload every requested document before submitting your response.",
    participantScope: first.configuration.participantScope,
    question: `Please provide: ${rows.map((row) => row.requirementName).join(", ")}.`,
    recipientScope: first.configuration.recipientScope,
    requestedDocumentRequirementIds: rows.map((row) => row.requirementId),
    requesterId: input.actorId,
    source: {
      actionDefinitionId: first.actionDefinitionId,
      actionKey: first.actionKey,
      stageDefinitionId: input.stageDefinitionId,
      stageInstanceId: input.stageInstanceId,
      stageKey: first.stageKey,
      taskId: first.taskId,
      workflowInstanceId: input.workflowInstanceId,
      workflowVersionId: first.workflowVersionId,
    },
  });
}
