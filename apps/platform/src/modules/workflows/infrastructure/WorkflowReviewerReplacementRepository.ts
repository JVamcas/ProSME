import "server-only";

import { sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { evaluateStageQuorum } from "./WorkflowQuorumRepository";
import {
  loadRequiredTaskCompletions,
  recordReviewThresholdEvaluations,
} from "./StageCompletionRepository";

export type ReplaceReviewerInput = {
  actorId: string;
  coiDecision?: "RECUSE";
  correlationId: string;
  expectedRowVersion: number;
  idempotencyKey: string;
  reason: string;
  replacementUserId: string;
  taskId: string;
};

type ReplacementResult = {
  taskId: string;
  reviewerSlot: number;
  replacedTaskId: string;
};

type LockedTask = {
  assignedUserId: string | null;
  reviewerSlot: number;
  rowVersion: number;
  stageInstanceId: string;
  stageDefinitionId: string;
  submittedReplacementPolicy: "DENY" | "REOPEN_SLOT";
  status: string;
  workflowInstanceId: string;
  workflowTaskDefinitionId: string;
};

type Transaction = Parameters<
  Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
>[0];

function auditReason(input: ReplaceReviewerInput) {
  return input.coiDecision === "RECUSE"
    ? "Conflict of interest recusal"
    : input.reason;
}

async function findReplacementReplay(
  transaction: Transaction,
  input: ReplaceReviewerInput,
): Promise<ReplacementResult | null | "CONFLICT"> {
  const replay = await transaction.execute(sql`
    SELECT actor_id AS "actorId", task_id AS "taskId",
      after ->> 'replacementTaskId' AS "replacementTaskId",
      after ->> 'replacementUserId' AS "replacementUserId",
      after ->> 'coiDecision' AS "coiDecision",
      after ->> 'reviewerSlot' AS "reviewerSlot",
      before ->> 'rowVersion' AS "rowVersion", reason
    FROM app_workflow_audit_entries
    WHERE idempotency_key = ${input.idempotencyKey}
    LIMIT 1
  `);
  const prior = replay.rows[0] as {
    actorId: string;
    taskId: string;
    replacementTaskId: string | null;
    replacementUserId: string | null;
    coiDecision: string | null;
    reviewerSlot: string | null;
    rowVersion: string | null;
    reason: string | null;
  } | undefined;
  if (!prior) return null;
  if (prior.actorId !== input.actorId || prior.taskId !== input.taskId
    || prior.replacementUserId !== input.replacementUserId
    || prior.coiDecision !== (input.coiDecision ?? null)
    || Number(prior.rowVersion) !== input.expectedRowVersion
    || prior.reason !== auditReason(input) || !prior.replacementTaskId) {
    return "CONFLICT";
  }
  return {
    taskId: prior.replacementTaskId,
    reviewerSlot: Number(prior.reviewerSlot),
    replacedTaskId: input.taskId,
  };
}

export async function replaceWorkflowReviewer(
  input: ReplaceReviewerInput,
): Promise<ReplacementResult | null> {
  return getDatabase().transaction(async (transaction) => {
    const replay = await findReplacementReplay(transaction, input);
    if (replay === "CONFLICT") return null;
    if (replay) return replay;

    await transaction.execute(sql`
      SELECT stage.id
      FROM app_workflow_stage_instances stage
      JOIN app_workflow_tasks task ON task.stage_instance_id = stage.id
      WHERE task.id = ${input.taskId}::uuid
        AND stage.status = 'ACTIVE'
      FOR UPDATE OF stage
    `);
    const concurrentReplay = await findReplacementReplay(transaction, input);
    if (concurrentReplay === "CONFLICT") return null;
    if (concurrentReplay) return concurrentReplay;
    const locked = await transaction.execute(sql`
      SELECT task.assigned_user_id AS "assignedUserId",
        task.reviewer_slot AS "reviewerSlot",
        task.row_version AS "rowVersion",
        task.stage_instance_id AS "stageInstanceId",
        stage.workflow_stage_definition_id AS "stageDefinitionId",
        task.status,
        definition.submitted_replacement_policy AS "submittedReplacementPolicy",
        workflow.id AS "workflowInstanceId",
        task.workflow_task_definition_id AS "workflowTaskDefinitionId"
      FROM app_workflow_tasks task
      JOIN app_workflow_stage_instances stage ON stage.id = task.stage_instance_id
      JOIN app_stage_task_definitions definition
        ON definition.id = task.workflow_task_definition_id
      JOIN app_workflow_instances workflow ON workflow.id = stage.workflow_instance_id
      WHERE task.id = ${input.taskId}::uuid
        AND stage.status = 'ACTIVE' AND workflow.status = 'ACTIVE'
      FOR UPDATE OF task
    `);
    const task = locked.rows[0] as LockedTask | undefined;
    if (!task || task.rowVersion !== input.expectedRowVersion
      || !(
        ["PENDING", "CLAIMED", "IN_PROGRESS"].includes(task.status)
        || (task.status === "COMPLETED"
          && task.submittedReplacementPolicy === "REOPEN_SLOT"
          && input.coiDecision !== "RECUSE")
      )
      || task.assignedUserId === input.replacementUserId) {
      return null;
    }
    const candidate = await transaction.execute(sql`
      SELECT 1
      FROM app_stage_task_definitions definition
      JOIN app_user_roles membership
        ON membership.role_id = definition.assignment_role_id
      JOIN app_users candidate ON candidate.id = membership.user_id
      WHERE definition.id = ${task.workflowTaskDefinitionId}::uuid
        AND definition.assignment_mode = 'ROLE'
        AND candidate.id = ${input.replacementUserId}::uuid
        AND candidate.status = 'active'
          AND NOT EXISTS (
          SELECT 1
          FROM (VALUES
            (definition.permissions ->> 'view'),
            (definition.permissions ->> 'edit'),
            (definition.permissions ->> 'decide')
          ) required(code)
          WHERE NOT EXISTS (
            SELECT 1 FROM app_role_capabilities grant_record
            JOIN app_capabilities capability
              ON capability.id = grant_record.capability_id
            JOIN app_user_roles granted_role
              ON granted_role.role_id = grant_record.role_id
            WHERE granted_role.user_id = candidate.id
              AND capability.code = required.code
          )
        )
        AND NOT EXISTS (
          SELECT 1 FROM app_workflow_task_coi clearance
          JOIN app_workflow_tasks prior_task ON prior_task.id = clearance.task_id
          WHERE prior_task.stage_instance_id = ${task.stageInstanceId}::uuid
            AND clearance.user_id = candidate.id
            AND clearance.state IN ('PENDING_REVIEW', 'RECUSED', 'REVOKED')
        )
        AND NOT EXISTS (
          SELECT 1 FROM app_workflow_tasks sibling
          WHERE sibling.stage_instance_id = ${task.stageInstanceId}::uuid
            AND sibling.workflow_task_definition_id = definition.id
            AND sibling.id <> ${input.taskId}::uuid
            AND sibling.assigned_user_id = candidate.id
            AND sibling.status <> 'CANCELLED'
        )
      LIMIT 1
    `);
    if (!candidate.rowCount) return null;

    if (input.coiDecision === "RECUSE") {
      const clearance = await transaction.execute(sql`
        SELECT state FROM app_workflow_task_coi
        WHERE task_id = ${input.taskId}::uuid
          AND user_id = ${task.assignedUserId}::uuid
        FOR UPDATE
      `);
      if (task.assignedUserId === input.actorId
        || (clearance.rows[0] as { state: string } | undefined)?.state
          !== "PENDING_REVIEW") return null;
      await transaction.execute(sql`
        UPDATE app_workflow_task_coi
        SET state = 'RECUSED', row_version = row_version + 1,
          updated_at = now()
        WHERE task_id = ${input.taskId}::uuid
      `);
      await transaction.execute(sql`
        INSERT INTO app_workflow_task_coi_events (
          task_id, subject_user_id, actor_id, from_state, to_state, reason
        ) VALUES (
          ${input.taskId}::uuid, ${task.assignedUserId}::uuid,
          ${input.actorId}::uuid, 'PENDING_REVIEW', 'RECUSED',
          ${input.reason}
        )
      `);
    }
    const replacedAt = new Date();
    const cancelled = await transaction.execute(sql`
      UPDATE app_workflow_tasks
      SET status = CASE
          WHEN status = 'COMPLETED' THEN status ELSE 'CANCELLED'
        END,
        completed_at = CASE
          WHEN status = 'COMPLETED' THEN completed_at
          ELSE ${replacedAt}::timestamptz
        END,
        row_version = row_version + 1
      WHERE id = ${input.taskId}::uuid
        AND row_version = ${input.expectedRowVersion}
      RETURNING id
    `);
    if (!cancelled.rowCount) return null;
    const replacement = await transaction.execute(sql`
      INSERT INTO app_workflow_tasks (
        stage_instance_id, workflow_task_definition_id, reviewer_slot,
        supersedes_task_id, form_version_id, assigned_user_id, assigned_role_id,
        status, claimed_at, due_at, created_at
      )
      SELECT stage_instance_id, workflow_task_definition_id, reviewer_slot,
        id, form_version_id, ${input.replacementUserId}::uuid,
        definition.assignment_role_id, 'CLAIMED', ${replacedAt}, due_at,
        ${replacedAt}
      FROM app_workflow_tasks old_task
      JOIN app_stage_task_definitions definition
        ON definition.id = old_task.workflow_task_definition_id
      WHERE old_task.id = ${input.taskId}::uuid
      RETURNING id
    `);
    const replacementTaskId = (replacement.rows[0] as { id: string }).id;
    const requirements = await loadRequiredTaskCompletions(
      transaction,
      task.stageInstanceId,
    );
    await recordReviewThresholdEvaluations(transaction, {
      actorId: input.actorId,
      requirements,
      stageInstanceId: task.stageInstanceId,
      triggerTaskId: replacementTaskId,
    });
    if (input.coiDecision === "RECUSE") {
      await evaluateStageQuorum(transaction, {
        actorId: input.actorId,
        stageDefinitionId: task.stageDefinitionId,
        stageInstanceId: task.stageInstanceId,
      });
    }
    const after = {
      replacementTaskId,
      reviewerSlot: task.reviewerSlot,
      replacementUserId: input.replacementUserId,
      coiDecision: input.coiDecision ?? null,
      status: task.status === "COMPLETED" ? "COMPLETED" : "CANCELLED",
    };
    await transaction.execute(sql`
      INSERT INTO app_workflow_audit_entries (
        actor_id, action, target_type, target_id, correlation_id,
        idempotency_key, workflow_instance_id, stage_instance_id, task_id,
        reason, before, after
      ) VALUES (
        ${input.actorId}::uuid, 'TASK_REPLACED', 'WORKFLOW_TASK',
        ${input.taskId}, ${input.correlationId}::uuid,
        ${input.idempotencyKey}, ${task.workflowInstanceId}::uuid,
        ${task.stageInstanceId}::uuid, ${input.taskId}::uuid,
        ${auditReason(input)}, ${JSON.stringify({
          assignedUserId: task.assignedUserId,
          rowVersion: task.rowVersion,
          status: task.status,
        })}::jsonb, ${JSON.stringify(after)}::jsonb
      )
    `);
    await transaction.execute(sql`
      INSERT INTO app_workflow_events (
        workflow_instance_id, event_code, actor_id, correlation_id, payload
      ) VALUES (
        ${task.workflowInstanceId}::uuid, 'TASK_REPLACED',
        ${input.actorId}::uuid, ${input.correlationId}::uuid,
        ${JSON.stringify({
          oldTaskId: input.taskId,
          replacementTaskId,
          reviewerSlot: task.reviewerSlot,
        })}::jsonb
      )
    `);
    return {
      taskId: replacementTaskId,
      reviewerSlot: task.reviewerSlot,
      replacedTaskId: input.taskId,
    };
  });
}
