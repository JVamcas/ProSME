import "server-only";

import { asc, eq, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  stageTaskDefinitions,
  stageTaskFormBindings,
  workflowInstances,
  workflowStageDefinitions,
} from "@/db/schema";
import type { StageInstanceStatus } from "../domain/runtime/StageInstance";
import type { WorkflowPublicStatusMapping } from "../domain/definitions/WorkflowStageDefinition";
import { createStageInstance } from "./StageInstanceRepository";
import type { WorkflowInstanceTransaction } from "./WorkflowInstanceRepository";
import { createWorkflowTasks } from "./WorkflowTaskWriteRepository";
import { resolveEligibilityTaskFormVersion } from "./EligibilityTaskFormRepository";
import { workflowTaskInheritsEligibilityForm } from "../domain/definitions/WorkflowEligibilityForm";
import { appendStageActivationAudit } from "./StageActivationAuditRepository";
import { allocateStageReviewers } from "./WorkflowTaskAutoAssignmentRepository";
import { initializeWorkflowReworkData } from "./WorkflowReworkDataRepository";

export type StageActivationTransaction = WorkflowInstanceTransaction;

export type StageActivationTarget = {
  application: Record<string, unknown>;
  applicationId: string;
  applicationReference: string;
  eligibility: Record<string, unknown> | null;
  entryCondition: typeof workflowStageDefinitions.$inferSelect.entryCondition;
  fundingCall: Record<string, unknown>;
  fundingOpportunityTitle: string;
  joinPredecessorStageKeys: string[];
  repeatable: boolean;
  publicStatus: WorkflowPublicStatusMapping;
  slaHours: number | null;
  stageDefinitionId: string;
  stageKey: string;
  stageName: string;
  workflowInstanceId: string;
};

export type StageActivationTaskDefinition = {
  config?: unknown;
  formVersionId: string | null;
  id: string;
  name: string;
  namedUserOverrideId: string | null;
  reviewerCount: number;
  taskType: "CONTRIBUTING" | "STAGE_DECISION";
  roleId: string | null;
  stableKey: string;
};

export type ExistingStageIteration = {
  activatedAt: Date;
  id: string;
  iterationNumber: number;
  status: StageInstanceStatus;
};

export type PersistStageActivationInput = {
  activatedAt: Date;
  actorId: string;
  correlationId: string;
  iterationNumber: number;
  referralContext?: Record<string, unknown> | null;
  returnContext?: Record<string, unknown> | null;
  target: StageActivationTarget;
  tasks: StageActivationTaskDefinition[];
};

export function withStageActivationTransaction<T>(
  work: (transaction: StageActivationTransaction) => Promise<T>,
) {
  return getDatabase().transaction(work);
}

export async function findStageIteration(
  transaction: StageActivationTransaction,
  workflowInstanceId: string,
  stageDefinitionId: string,
  iterationNumber: number,
): Promise<ExistingStageIteration | null> {
  const [stage] = await transaction.query.stageInstances.findMany({
    columns: {
      activatedAt: true,
      id: true,
      iterationNumber: true,
      status: true,
    },
    limit: 1,
    where: (table, operators) =>
      operators.and(
        operators.eq(table.workflowInstanceId, workflowInstanceId),
        operators.eq(table.workflowStageDefinitionId, stageDefinitionId),
        operators.eq(table.iterationNumber, iterationNumber),
      ),
  });
  return stage ?? null;
}

export async function nextStageIterationNumber(
  transaction: Pick<StageActivationTransaction, "execute">,
  workflowInstanceId: string,
  stageDefinitionId: string,
) {
  const result = await transaction.execute(sql`
    SELECT coalesce(max(iteration_number), 0)::integer + 1 AS "iterationNumber"
    FROM app_workflow_stage_instances
    WHERE workflow_instance_id = ${workflowInstanceId}::uuid
      AND workflow_stage_definition_id = ${stageDefinitionId}::uuid
  `);
  return (result.rows[0] as { iterationNumber: number }).iterationNumber;
}

export async function loadStageReworkIteration(
  transaction: Pick<StageActivationTransaction, "execute">,
  workflowInstanceId: string,
  stageDefinitionId: string,
) {
  const result = await transaction.execute<{
    nextIterationNumber: number;
    activeStageInstanceId: string | null;
  }>(sql`
    SELECT coalesce(max(iteration_number), 0)::integer + 1 AS "nextIterationNumber",
      (array_agg(id ORDER BY iteration_number DESC)
        FILTER (WHERE status IN ('ACTIVE', 'BLOCKED')))[1] AS "activeStageInstanceId"
    FROM app_workflow_stage_instances
    WHERE workflow_instance_id = ${workflowInstanceId}::uuid
      AND workflow_stage_definition_id = ${stageDefinitionId}::uuid
  `);
  return result.rows[0];
}

export async function loadIncompleteJoinPredecessors(
  transaction: Pick<StageActivationTransaction, "execute">,
  workflowInstanceId: string,
  stageDefinitionId: string,
): Promise<string[]> {
  const result = await transaction.execute(sql`
    SELECT predecessor.code AS "stageKey"
    FROM app_workflow_stage_join_predecessors dependency
    JOIN app_workflow_stage_definitions predecessor
      ON predecessor.id = dependency.predecessor_stage_id
    WHERE dependency.stage_id = ${stageDefinitionId}::uuid
      AND NOT EXISTS (
        SELECT 1
        FROM app_workflow_stage_instances completed
        WHERE completed.workflow_instance_id = ${workflowInstanceId}::uuid
          AND completed.workflow_stage_definition_id = dependency.predecessor_stage_id
          AND completed.status = 'COMPLETED'
      )
    ORDER BY predecessor.code
  `);
  return (result.rows as Array<{ stageKey: string }>).map(
    (row) => row.stageKey,
  );
}

export async function loadStageActivationTasks(
  transaction: StageActivationTransaction,
  stageDefinitionId: string,
): Promise<StageActivationTaskDefinition[]> {
  return transaction
    .select({
      config: stageTaskDefinitions.config,
      formVersionId: stageTaskFormBindings.formVersionId,
      id: stageTaskDefinitions.id,
      name: stageTaskDefinitions.name,
      namedUserOverrideId: stageTaskDefinitions.namedUserOverrideId,
      reviewerCount: stageTaskDefinitions.reviewerCount,
      taskType: stageTaskDefinitions.taskType,
      roleId: stageTaskDefinitions.roleId,
      stableKey: stageTaskDefinitions.stableKey,
    })
    .from(stageTaskDefinitions)
    .leftJoin(
      stageTaskFormBindings,
      eq(stageTaskFormBindings.taskDefinitionId, stageTaskDefinitions.id),
    )
    .where(eq(stageTaskDefinitions.stageId, stageDefinitionId))
    .orderBy(asc(stageTaskDefinitions.displayOrder));
}

export { loadPriorStageContext } from "./StageActivationContextRepository";

export async function persistStageActivation(
  transaction: StageActivationTransaction,
  input: PersistStageActivationInput,
) {
  const stage = await createStageInstance(transaction, {
    activatedAt: input.activatedAt,
    iterationNumber: input.iterationNumber,
    referralContext: input.referralContext,
    returnContext: input.returnContext,
    workflowInstanceId: input.target.workflowInstanceId,
    workflowStageDefinitionId: input.target.stageDefinitionId,
  });
  const dueAt =
    input.target.slaHours === null
      ? null
      : new Date(
          input.activatedAt.getTime() + input.target.slaHours * 3_600_000,
        );
  const needsEligibilityForm = input.tasks.some(
    workflowTaskInheritsEligibilityForm,
  );
  const eligibilityFormVersionId = needsEligibilityForm
    ? await resolveEligibilityTaskFormVersion(
        transaction,
        input.target.workflowInstanceId,
      )
    : null;
  if (needsEligibilityForm && !eligibilityFormVersionId) {
    throw new Error(
      "The application's published eligibility ruleset has no verification form.",
    );
  }
  const assignments = await allocateStageReviewers(
    transaction,
    input.target.workflowInstanceId,
    input.tasks,
  );
  const tasks = await createWorkflowTasks(
    transaction,
    input.tasks.flatMap((task) =>
      Array.from({ length: task.reviewerCount }, (_, index) => ({
        assignedRoleId: null,
        assignedUserId: assignments.get(task.id)?.[index] ?? null,
        createdAt: input.activatedAt,
        dueAt,
        formVersionId: workflowTaskInheritsEligibilityForm(task)
          ? eligibilityFormVersionId!
          : task.formVersionId,
        stageInstanceId: stage.id,
        workflowTaskDefinitionId: task.id,
        reviewerSlot: index + 1,
      })),
    ),
  );
  const dataHandling = input.returnContext?.dataHandling;
  if (dataHandling === "RETAIN" || dataHandling === "CLEAR") {
    const lineage = await initializeWorkflowReworkData(transaction, {
      actorId: input.actorId,
      correlationId: input.correlationId,
      dataHandling,
      stageInstanceId: stage.id,
    });
    const sources = new Map(
      lineage.map((link) => [link.taskId, link.sourceTaskId]),
    );
    for (const task of tasks) {
      task.supersedesTaskId = sources.get(task.id) ?? null;
    }
  }
  await transaction
    .update(workflowInstances)
    .set({ currentStageInstanceId: stage.id })
    .where(eq(workflowInstances.id, input.target.workflowInstanceId));
  await appendStageActivationAudit(transaction, {
    actorId: input.actorId,
    correlationId: input.correlationId,
    iterationNumber: stage.iterationNumber,
    stageDefinitionId: input.target.stageDefinitionId,
    stageId: stage.id,
    stageKey: input.target.stageKey,
    publicStatus: input.target.publicStatus,
    tasks,
    workflowInstanceId: input.target.workflowInstanceId,
    joinDriven: input.target.joinPredecessorStageKeys.length > 0,
  });
  return { stage, tasks };
}

export { lockStageActivationTarget } from "./StageActivationTargetRepository";
