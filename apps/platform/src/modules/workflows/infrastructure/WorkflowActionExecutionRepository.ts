import "server-only";

import { taskWorkIsReady } from "@/modules/workflows/WorkflowTaskRegistry";

import { and, eq, inArray, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  stageInstances,
  stageTaskActionBindings,
  stageTaskDefinitions,
  workflowActionDefinitions,
  workflowTasks,
} from "@/db/schema";
import type { WorkflowActionDefinition } from "../domain/actions/WorkflowActionDefinition";
import type {
  WorkflowActionExecutionResult,
  WorkflowActionInput,
} from "../domain/actions/WorkflowActionExecution";
import type { WorkflowElementPermissions } from "../domain/definitions/WorkflowElementPermissions";
import type { StageCompletionTarget } from "./StageCompletionRepository";
import { workflowEligibilityActionReady } from "./WorkflowEligibilityActionReadiness";
import { workflowTaskPrerequisitesComplete } from "./WorkflowTaskPrerequisiteReadiness";
import {
  lockStageCompletionTarget,
  type StageCompletionTransaction,
} from "./StageCompletionRepository";

export type WorkflowActionExecutionTransaction = StageCompletionTransaction;

export type WorkflowActionExecutionTarget = {
  action: WorkflowActionDefinition & { id: string };
  stage: StageCompletionTarget & { rowVersion: number };
  task: {
    activeDeferral?: boolean;
    activeEscalation?: boolean;
    activeEscalationBlocks?: boolean;
    activeEscalationTargetActor?: boolean;
    activeHold?: boolean;
    activeReferral?: boolean;
    assignedToActor: boolean;
    eligibilityReady?: boolean;
    id: string;
    permissions: WorkflowElementPermissions;
    prerequisitesComplete: boolean;
    rowVersion: number;
    status: string;
  } | null;
};

type ReplayCommand = {
  actionKey: string;
  actorId: string;
  expectedRuntimeVersion: number;
  input: WorkflowActionInput;
  sourceStageInstanceId: string;
  taskId?: string;
  workflowInstanceId: string;
};

export type ActionExecutionReplay = {
  matchesCommand: boolean;
  result: WorkflowActionExecutionResult;
};

export async function findWorkflowActionExecution(
  executor: Pick<ReturnType<typeof getDatabase>, "execute">,
  idempotencyKey: string,
  command: ReplayCommand,
): Promise<ActionExecutionReplay | null> {
  const found = await executor.execute(sql`
    SELECT result,
      action_key = ${command.actionKey} AS "sameAction",
      actor_id = ${command.actorId}::uuid AS "sameActor",
      expected_runtime_version = ${command.expectedRuntimeVersion}
        AS "sameVersion",
      normalized_input = ${JSON.stringify(command.input)}::jsonb AS "sameInput",
      source_stage_instance_id = ${command.sourceStageInstanceId}::uuid
        AS "sameStage",
      workflow_instance_id = ${command.workflowInstanceId}::uuid
        AS "sameWorkflow",
      task_id IS NOT DISTINCT FROM ${command.taskId ?? null}::uuid AS "sameTask"
    FROM app_workflow_action_executions
    WHERE idempotency_key = ${idempotencyKey}
    LIMIT 1
  `);
  const row = found.rows[0] as ({
    result: WorkflowActionExecutionResult;
    sameAction: boolean;
    sameActor: boolean;
    sameInput: boolean;
    sameStage: boolean;
    sameTask: boolean;
    sameVersion: boolean;
    sameWorkflow: boolean;
  } | undefined);
  if (!row) return null;
  return {
    matchesCommand: row.sameAction
      && row.sameActor
      && row.sameInput
      && row.sameStage
      && row.sameTask
      && row.sameVersion
      && row.sameWorkflow,
    result: row.result,
  };
}

async function lockTask(
  transaction: WorkflowActionExecutionTransaction,
  input: {
    actionKey: string;
    actorId: string;
    stageDefinitionId: string;
    stageInstanceId: string;
    taskId: string;
  },
) {
  const [task] = await transaction
    .select({
      activeDeferral: sql<boolean>`EXISTS (
        SELECT 1 FROM app_workflow_deferrals deferral
        WHERE deferral.stage_instance_id = ${workflowTasks.stageInstanceId}
          AND deferral.status = 'ACTIVE'
      )`,
      activeEscalation: sql<boolean>`EXISTS (
        SELECT 1 FROM app_workflow_escalations escalation
        WHERE escalation.task_id = ${workflowTasks.id}
          AND escalation.status = 'ACTIVE'
      )`,
      activeEscalationBlocks: sql<boolean>`EXISTS (
        SELECT 1 FROM app_workflow_escalations escalation
        WHERE escalation.task_id = ${workflowTasks.id}
          AND escalation.status = 'ACTIVE'
          AND escalation.block_until_resolved
      )`,
      activeEscalationTargetActor: sql<boolean>`EXISTS (
        SELECT 1 FROM app_workflow_escalations escalation
        WHERE escalation.task_id = ${workflowTasks.id}
          AND escalation.status = 'ACTIVE'
          AND (
            escalation.target_user_id = ${input.actorId}::uuid
            OR EXISTS (
              SELECT 1 FROM app_user_roles escalation_role
              WHERE escalation_role.user_id = ${input.actorId}::uuid
                AND escalation_role.role_id = escalation.target_role_id
            )
          )
      )`,
      activeHold: sql<boolean>`EXISTS (
        SELECT 1 FROM app_workflow_holds hold
        WHERE hold.stage_instance_id = ${workflowTasks.stageInstanceId}
          AND hold.status = 'ACTIVE'
      )`,
      activeReferral: sql<boolean>`EXISTS (
        SELECT 1 FROM app_workflow_referrals referral
        WHERE referral.source_task_id = ${workflowTasks.id}
          AND referral.status = 'ACTIVE'
          AND referral.source_task_behavior = 'BLOCKED'
      )`,
      assignedToActor: sql<boolean>`(
        ${workflowTasks.assignedUserId} = ${input.actorId}::uuid
        OR (
          ${workflowTasks.assignedUserId} IS NULL
          AND EXISTS (
            SELECT 1 FROM app_user_roles actor_role
            WHERE actor_role.user_id = ${input.actorId}::uuid
              AND actor_role.role_id = ${workflowTasks.assignedRoleId}
          )
        ) OR EXISTS (
          SELECT 1 FROM app_workflow_escalations escalation
          WHERE escalation.task_id = ${workflowTasks.id}
            AND escalation.status = 'ACTIVE'
            AND (
              escalation.target_user_id = ${input.actorId}::uuid
              OR EXISTS (
                SELECT 1 FROM app_user_roles escalation_role
                WHERE escalation_role.user_id = ${input.actorId}::uuid
                  AND escalation_role.role_id = escalation.target_role_id
              )
            )
        )
      )`,
      eligibilityReady: workflowEligibilityActionReady,
      id: workflowTasks.id,
      permissions: stageTaskDefinitions.permissions,
      prerequisitesComplete: workflowTaskPrerequisitesComplete,
      rowVersion: workflowTasks.rowVersion,
      status: workflowTasks.status,
    })
    .from(workflowTasks)
    .innerJoin(
      stageTaskDefinitions,
      eq(stageTaskDefinitions.id, workflowTasks.workflowTaskDefinitionId),
    )
    .innerJoin(
      stageTaskActionBindings,
      and(
        eq(
          stageTaskActionBindings.taskDefinitionId,
          workflowTasks.workflowTaskDefinitionId,
        ),
        eq(stageTaskActionBindings.stageId, input.stageDefinitionId),
        eq(stageTaskActionBindings.actionKey, input.actionKey),
      ),
    )
    .where(and(
      eq(workflowTasks.id, input.taskId),
      eq(workflowTasks.stageInstanceId, input.stageInstanceId),
      sql`app_workflow_task_coi_cleared(${workflowTasks.id}, ${input.actorId}::uuid)`,
    ))
    .for("update", { of: workflowTasks })
    .limit(1);
  return task ?? null;
}

export async function lockWorkflowActionExecutionTarget(
  transaction: WorkflowActionExecutionTransaction,
  input: {
    actionKey: string;
    actorId: string;
    sourceStageInstanceId: string;
    taskId?: string;
  },
): Promise<WorkflowActionExecutionTarget | null> {
  const stage = await lockStageCompletionTarget(
    transaction,
    input.sourceStageInstanceId,
    ["ACTIVE", "BLOCKED"],
  );
  if (!stage) return null;
  const clearance = await transaction.execute(sql`
    SELECT NOT stage_definition.coi_gated OR EXISTS (
      SELECT 1 FROM app_workflow_tasks assignment
      WHERE assignment.stage_instance_id = ${input.sourceStageInstanceId}::uuid
        AND (
          assignment.assigned_user_id = ${input.actorId}::uuid
          OR EXISTS (
            SELECT 1 FROM app_workflow_escalations escalation
            WHERE escalation.task_id = assignment.id
              AND escalation.status = 'ACTIVE'
              AND (
                escalation.target_user_id = ${input.actorId}::uuid
                OR EXISTS (
                  SELECT 1 FROM app_user_roles escalation_role
                  WHERE escalation_role.user_id = ${input.actorId}::uuid
                    AND escalation_role.role_id = escalation.target_role_id
                )
              )
          )
        )
        AND assignment.status <> 'CANCELLED'
        AND app_workflow_task_coi_cleared(assignment.id, ${input.actorId}::uuid)
    ) AS cleared
    FROM app_workflow_stage_instances stage
    JOIN app_workflow_stage_definitions stage_definition
      ON stage_definition.id = stage.workflow_stage_definition_id
    WHERE stage.id = ${input.sourceStageInstanceId}::uuid
  `);
  if (!(clearance.rows[0] as { cleared: boolean } | undefined)?.cleared) {
    return null;
  }
  const [action] = await transaction
    .select()
    .from(workflowActionDefinitions)
    .where(and(
      eq(workflowActionDefinitions.stageId, stage.stageDefinitionId),
      eq(workflowActionDefinitions.stableKey, input.actionKey),
      eq(workflowActionDefinitions.enabled, true),
    ))
    .limit(1);
  if (!action) return null;
  const task = input.taskId
    ? await lockTask(transaction, {
        actionKey: input.actionKey,
        actorId: input.actorId,
        stageDefinitionId: stage.stageDefinitionId,
        stageInstanceId: stage.stageInstanceId,
        taskId: input.taskId,
      })
    : null;
  if (input.taskId && !task) return null;
  return {
    action: {
      actionType: action.actionType,
      condition: action.condition,
      configuration: action.configuration,
      displayOrder: action.displayOrder,
      enabled: action.enabled,
      id: action.id,
      label: action.label,
      reasonCodeRequired: action.reasonCodeRequired,
      stableKey: action.stableKey,
    } as WorkflowActionDefinition & { id: string },
    stage: stage as StageCompletionTarget & { rowVersion: number },
    task,
  };
}

export async function claimWorkflowActionRuntimeVersion(
  transaction: WorkflowActionExecutionTransaction,
  stageInstanceId: string,
  expectedRuntimeVersion: number,
  allowedStatuses: Array<"ACTIVE" | "BLOCKED"> = ["ACTIVE"],
) {
  const [stage] = await transaction
    .update(stageInstances)
    .set({ rowVersion: expectedRuntimeVersion + 1 })
    .where(and(
      eq(stageInstances.id, stageInstanceId),
      eq(stageInstances.rowVersion, expectedRuntimeVersion),
      inArray(stageInstances.status, allowedStatuses),
    ))
    .returning({ rowVersion: stageInstances.rowVersion });
  return stage?.rowVersion ?? null;
}

export async function completeActionTask(
  transaction: WorkflowActionExecutionTransaction,
  input: {
    normalizedInput: WorkflowActionInput;
    task: NonNullable<WorkflowActionExecutionTarget["task"]>;
  },
) {
  const [work] = await transaction
    .select({
      config: stageTaskDefinitions.config,
      formCompleted: sql<boolean>`(
        ${workflowTasks.formVersionId} IS NOT NULL AND EXISTS (
          SELECT 1 FROM app_form_responses response
          WHERE response.workflow_task_id = ${workflowTasks.id}
            AND (response.status = 'COMPLETED'
              OR (
                ${stageTaskDefinitions.config} ->> 'command' = 'AUTHORITATIVE_ELIGIBILITY'
                AND response.values = (${workflowTasks.result} -> 'evaluatedFormValues')
              ))
        )
      )`,
      formRequired: sql<boolean>`${workflowTasks.formVersionId} IS NOT NULL`,
      hasChecklist: sql<boolean>`EXISTS (
        SELECT 1 FROM app_workflow_stage_checklist_definitions checklist
        WHERE checklist.task_definition_id = ${stageTaskDefinitions.id}
      )`,
      result: workflowTasks.result,
    })
    .from(workflowTasks)
    .innerJoin(
      stageTaskDefinitions,
      eq(stageTaskDefinitions.id, workflowTasks.workflowTaskDefinitionId),
    )
    .where(eq(workflowTasks.id, input.task.id))
    .limit(1);
  if (!work || !taskWorkIsReady(work)) return null;
  const completedAt = new Date();
  const [task] = await transaction
    .update(workflowTasks)
    .set({
      completedAt,
      result: sql`COALESCE(${workflowTasks.result}, '{}'::jsonb)
        || ${JSON.stringify({ action: input.normalizedInput })}::jsonb`,
      rowVersion: input.task.rowVersion + 1,
      startedAt: sql`COALESCE(${workflowTasks.startedAt}, ${completedAt})`,
      status: "COMPLETED",
    })
    .where(and(
      eq(workflowTasks.id, input.task.id),
      eq(workflowTasks.rowVersion, input.task.rowVersion),
      sql`${workflowTasks.status} IN ('PENDING', 'IN_PROGRESS')`,
      sql`NOT EXISTS (
        SELECT 1 FROM app_workflow_rfis rfi
        WHERE rfi.task_id = ${workflowTasks.id}
          AND rfi.status = 'OPEN'
      )`,
    ))
    .returning({ id: workflowTasks.id });
  return task ?? null;
}

export { recordWorkflowActionExecution } from "./WorkflowActionExecutionRecordsRepository";
