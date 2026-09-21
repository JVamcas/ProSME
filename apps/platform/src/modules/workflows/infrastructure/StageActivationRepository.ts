import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  applications,
  fundingCalls,
  stageInstances,
  stageTaskDefinitions,
  stageTaskFormBindings,
  workflowAuditEntries,
  workflowEvents,
  workflowInstances,
  workflowStageDefinitions,
} from "@/db/schema";
import type { StageInstanceStatus } from "../domain/runtime/StageInstance";
import { createStageInstance } from "./StageInstanceRepository";
import type { WorkflowInstanceTransaction } from "./WorkflowInstanceRepository";
import { createWorkflowTasks } from "./WorkflowTaskWriteRepository";

export type StageActivationTransaction = WorkflowInstanceTransaction;

export type StageActivationTarget = {
  application: Record<string, unknown>;
  currentStageInstanceId: string | null;
  entryCondition: typeof workflowStageDefinitions.$inferSelect.entryCondition;
  fundingCall: Record<string, unknown>;
  repeatable: boolean;
  slaHours: number | null;
  stageDefinitionId: string;
  stageKey: string;
  workflowInstanceId: string;
};

export type StageActivationTaskDefinition = {
  formVersionId: string | null;
  id: string;
  namedUserOverrideId: string | null;
  roleId: string | null;
  type: typeof stageTaskDefinitions.$inferSelect.type;
};

export type PriorStageActivationContext = {
  stableKey: string;
  values: Record<string, unknown>;
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

export async function lockStageActivationTarget(
  transaction: StageActivationTransaction,
  workflowInstanceId: string,
  stageDefinitionId: string,
): Promise<StageActivationTarget | null> {
  const [row] = await transaction
    .select({
      application: {
        business: applications.businessSection,
        declarationAcceptance: applications.declarationAcceptance,
        declarations: applications.declarationsSection,
        financial: applications.financialSection,
        fundingOpportunityId: applications.fundingOpportunityId,
        id: applications.id,
        project: applications.projectSection,
        reference: applications.reference,
        sectionCompletion: applications.sectionCompletion,
        status: applications.status,
      },
      currentStageInstanceId: workflowInstances.currentStageInstanceId,
      entryCondition: workflowStageDefinitions.entryCondition,
      fundingCall: {
        closesAt: fundingCalls.closesAt,
        id: fundingCalls.id,
        maximumAmount: fundingCalls.maximumGrantAmount,
        minimumAmount: fundingCalls.minimumGrantAmount,
        opensAt: fundingCalls.opensAt,
        slug: fundingCalls.slug,
        status: fundingCalls.status,
        title: fundingCalls.title,
      },
      repeatable: workflowStageDefinitions.repeatable,
      slaHours: workflowStageDefinitions.slaHours,
      stageDefinitionId: workflowStageDefinitions.id,
      stageKey: workflowStageDefinitions.code,
      workflowInstanceId: workflowInstances.id,
    })
    .from(workflowInstances)
    .innerJoin(
      applications,
      eq(applications.id, workflowInstances.applicationId),
    )
    .innerJoin(
      fundingCalls,
      eq(fundingCalls.id, applications.fundingOpportunityId),
    )
    .innerJoin(
      workflowStageDefinitions,
      and(
        eq(workflowStageDefinitions.id, stageDefinitionId),
        eq(
          workflowStageDefinitions.versionId,
          workflowInstances.workflowTemplateVersionId,
        ),
        eq(workflowStageDefinitions.enabled, true),
      ),
    )
    .where(and(
      eq(workflowInstances.id, workflowInstanceId),
      eq(workflowInstances.status, "ACTIVE"),
    ))
    .for("update", { of: workflowInstances })
    .limit(1);

  if (!row) return null;
  const {
    business,
    declarations,
    financial,
    project,
    ...application
  } = row.application;
  return {
    ...row,
    application: {
      ...application,
      ...business,
      ...project,
      ...financial,
      ...declarations,
    },
    fundingCall: {
      ...row.fundingCall,
      maximumAmount: Number(row.fundingCall.maximumAmount),
      minimumAmount: Number(row.fundingCall.minimumAmount),
    },
  };
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
    where: (table, operators) => operators.and(
      operators.eq(table.workflowInstanceId, workflowInstanceId),
      operators.eq(table.workflowStageDefinitionId, stageDefinitionId),
      operators.eq(table.iterationNumber, iterationNumber),
    ),
  });
  return stage ?? null;
}

export async function findStageInstanceStatus(
  transaction: StageActivationTransaction,
  stageInstanceId: string,
): Promise<StageInstanceStatus | null> {
  const [stage] = await transaction
    .select({ status: stageInstances.status })
    .from(stageInstances)
    .where(eq(stageInstances.id, stageInstanceId))
    .limit(1);
  return stage?.status ?? null;
}

export async function loadStageActivationTasks(
  transaction: StageActivationTransaction,
  stageDefinitionId: string,
): Promise<StageActivationTaskDefinition[]> {
  return transaction
    .select({
      formVersionId: stageTaskFormBindings.formVersionId,
      id: stageTaskDefinitions.id,
      namedUserOverrideId: stageTaskDefinitions.namedUserOverrideId,
      roleId: stageTaskDefinitions.roleId,
      type: stageTaskDefinitions.type,
    })
    .from(stageTaskDefinitions)
    .leftJoin(
      stageTaskFormBindings,
      eq(stageTaskFormBindings.taskDefinitionId, stageTaskDefinitions.id),
    )
    .where(eq(stageTaskDefinitions.stageId, stageDefinitionId))
    .orderBy(asc(stageTaskDefinitions.displayOrder));
}

type PriorStageRow = {
  result: Record<string, unknown> | null;
  stageKey: string;
  values: Record<string, unknown> | null;
};

export async function loadPriorStageContext(
  transaction: StageActivationTransaction,
  workflowInstanceId: string,
): Promise<PriorStageActivationContext[]> {
  const result = await transaction.execute(sql`
    WITH latest_completed_stage AS (
      SELECT DISTINCT ON (definition.code)
        stage.id,
        definition.code
      FROM app_workflow_stage_instances stage
      JOIN app_workflow_stage_definitions definition
        ON definition.id = stage.workflow_stage_definition_id
      WHERE stage.workflow_instance_id = ${workflowInstanceId}::uuid
        AND stage.status = 'COMPLETED'
      ORDER BY definition.code, stage.iteration_number DESC,
        stage.completed_at DESC, stage.id DESC
    )
    SELECT latest.code AS "stageKey",
      response.values,
      task.result
    FROM latest_completed_stage latest
    LEFT JOIN app_workflow_tasks task
      ON task.stage_instance_id = latest.id
    LEFT JOIN app_form_responses response
      ON response.workflow_task_id = task.id
      AND response.status = 'COMPLETED'
    ORDER BY latest.code, task.created_at, task.id
  `);
  const stages = new Map<string, Record<string, unknown>>();
  for (const row of result.rows as PriorStageRow[]) {
    const values = stages.get(row.stageKey) ?? {};
    Object.assign(values, row.values ?? {}, row.result ?? {});
    stages.set(row.stageKey, values);
  }
  return [...stages].map(([stableKey, values]) => ({ stableKey, values }));
}

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
  const dueAt = input.target.slaHours === null
    ? null
    : new Date(
      input.activatedAt.getTime() + input.target.slaHours * 3_600_000,
    );
  const tasks = await createWorkflowTasks(
    transaction,
    input.tasks.map((task) => ({
      assignedRoleId: task.roleId,
      assignedUserId: task.namedUserOverrideId,
      createdAt: input.activatedAt,
      dueAt,
      formVersionId: task.formVersionId,
      stageInstanceId: stage.id,
      typeSnapshot: task.type,
      workflowTaskDefinitionId: task.id,
    })),
  );
  await transaction
    .update(workflowInstances)
    .set({ currentStageInstanceId: stage.id })
    .where(eq(workflowInstances.id, input.target.workflowInstanceId));
  const auditPayload = {
    iterationNumber: stage.iterationNumber,
    stageDefinitionId: input.target.stageDefinitionId,
    stageKey: input.target.stageKey,
    taskIds: tasks.map((task) => task.id),
  };
  await transaction.insert(workflowEvents).values({
    actorId: input.actorId,
    correlationId: input.correlationId,
    eventCode: "STAGE_ACTIVATED",
    payload: auditPayload,
    workflowInstanceId: input.target.workflowInstanceId,
  });
  await transaction.insert(workflowAuditEntries).values({
    action: "STAGE_ACTIVATED",
    actorId: input.actorId,
    after: auditPayload,
    before: null,
    correlationId: input.correlationId,
    targetId: stage.id,
    targetType: "WORKFLOW_STAGE_INSTANCE",
  });
  return { stage, tasks };
}
