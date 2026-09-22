import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  applications,
  authoritativeEligibilityOutcomes,
  fundingCalls,
  stageInstances,
  workflowAuditEntries,
  workflowEvents,
  workflowInstances,
  workflowStageDefinitions,
  workflowTasks,
} from "@/db/schema";
import type { StageInstanceStatus } from "../domain/runtime/StageInstance";
import type { RequiredTaskCompletion } from "../domain/runtime/StageCompletion";
import type { WorkflowInstanceStatus } from "../domain/runtime/WorkflowInstance";

export type StageCompletionTransaction = Parameters<
  Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
>[0];

export type StageCompletionTarget = {
  application: Record<string, unknown>;
  completedAt: Date | null;
  eligibility: Record<string, unknown> | null;
  exitCondition: typeof workflowStageDefinitions.$inferSelect.exitCondition;
  fundingCall: Record<string, unknown>;
  stageInstanceId: string;
  stageDefinitionId: string;
  stageKey: string;
  rowVersion?: number;
  status: StageInstanceStatus;
  workflowInstanceId: string;
  workflowStatus?: WorkflowInstanceStatus;
  workflowVersionId: string;
};

export type StageCompletionValueRow = {
  responseValues: Record<string, unknown> | null;
  taskResult: Record<string, unknown> | null;
};

export async function lockStageCompletionTarget(
  transaction: StageCompletionTransaction,
  stageInstanceId: string,
): Promise<StageCompletionTarget | null> {
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
      completedAt: stageInstances.completedAt,
      eligibility: {
        eligible: authoritativeEligibilityOutcomes.eligible,
        evaluatedAt: authoritativeEligibilityOutcomes.evaluatedAt,
        outcome: authoritativeEligibilityOutcomes.finalOutcome,
        hardFailureCount: sql<number>`jsonb_array_length(${authoritativeEligibilityOutcomes.hardFailures})`,
        manualScreeningRequired:
          authoritativeEligibilityOutcomes.manualScreeningRequired,
        ruleSetVersionId:
          authoritativeEligibilityOutcomes.ruleSetVersionId,
        ruleSetVersionNumber:
          authoritativeEligibilityOutcomes.ruleSetVersionNumber,
        softFailureCount: sql<number>`jsonb_array_length(${authoritativeEligibilityOutcomes.softFailures})`,
        warningCount: sql<number>`jsonb_array_length(${authoritativeEligibilityOutcomes.warnings})`,
      },
      exitCondition: workflowStageDefinitions.exitCondition,
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
      stageInstanceId: stageInstances.id,
      stageDefinitionId: stageInstances.workflowStageDefinitionId,
      stageKey: workflowStageDefinitions.code,
      rowVersion: stageInstances.rowVersion,
      status: stageInstances.status,
      workflowInstanceId: workflowInstances.id,
      workflowStatus: workflowInstances.status,
      workflowVersionId: workflowInstances.workflowTemplateVersionId,
    })
    .from(stageInstances)
    .innerJoin(
      workflowInstances,
      eq(workflowInstances.id, stageInstances.workflowInstanceId),
    )
    .innerJoin(
      workflowStageDefinitions,
      eq(
        workflowStageDefinitions.id,
        stageInstances.workflowStageDefinitionId,
      ),
    )
    .innerJoin(
      applications,
      eq(applications.id, workflowInstances.applicationId),
    )
    .innerJoin(
      fundingCalls,
      eq(fundingCalls.id, applications.fundingOpportunityId),
    )
    .leftJoin(
      authoritativeEligibilityOutcomes,
      and(
        eq(authoritativeEligibilityOutcomes.applicationId, applications.id),
        sql`${authoritativeEligibilityOutcomes.evaluationNumber} = (
          SELECT max(latest.evaluation_number)
          FROM app_authoritative_eligibility_outcomes latest
          WHERE latest.application_id = ${applications.id}
        )`,
      ),
    )
    .where(and(
      eq(stageInstances.id, stageInstanceId),
      eq(workflowInstances.status, "ACTIVE"),
      eq(stageInstances.status, "ACTIVE"),
    ))
    .for("update", { of: stageInstances })
    .limit(1);
  if (!row) return null;

  const { business, declarations, financial, project, ...application } =
    row.application;
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

export async function loadRequiredTaskCompletions(
  transaction: StageCompletionTransaction,
  stageInstanceId: string,
): Promise<RequiredTaskCompletion[]> {
  const result = await transaction.execute(sql`
    SELECT definition.id AS "taskDefinitionId",
      definition.code AS "taskKey",
      definition.required_completion_count AS "requiredCompletionCount",
      count(task.id) FILTER (WHERE task.status = 'COMPLETED')::integer
        AS "completedCount"
    FROM app_stage_task_definitions definition
    JOIN app_workflow_stage_instances stage
      ON stage.workflow_stage_definition_id = definition.stage_id
    LEFT JOIN app_workflow_tasks task
      ON task.stage_instance_id = stage.id
      AND task.workflow_task_definition_id = definition.id
    WHERE stage.id = ${stageInstanceId}::uuid
      AND definition.required = TRUE
    GROUP BY definition.id, definition.code,
      definition.required_completion_count
    ORDER BY definition.sequence, definition.id
  `);
  return result.rows as RequiredTaskCompletion[];
}

export async function loadStageCompletionValues(
  transaction: Pick<StageCompletionTransaction, "execute">,
  stageInstanceId: string,
): Promise<StageCompletionValueRow[]> {
  const result = await transaction.execute(sql`
    SELECT task.result AS "taskResult", response.values AS "responseValues"
    FROM app_workflow_tasks task
    LEFT JOIN app_form_responses response
      ON response.workflow_task_id = task.id
      AND response.status = 'COMPLETED'
    WHERE task.stage_instance_id = ${stageInstanceId}::uuid
      AND task.status = 'COMPLETED'
    ORDER BY task.created_at, task.id, response.created_at, response.id
  `);
  return result.rows as StageCompletionValueRow[];
}

export async function persistStageCompletion(
  transaction: StageCompletionTransaction,
  input: {
    actorId: string;
    completedAt: Date;
    correlationId: string;
    requirements: RequiredTaskCompletion[];
    target: StageCompletionTarget;
  },
) {
  const [completed] = await transaction
    .update(stageInstances)
    .set({ completedAt: input.completedAt, status: "COMPLETED" })
    .where(and(
      eq(stageInstances.id, input.target.stageInstanceId),
      eq(stageInstances.status, "ACTIVE"),
    ))
    .returning({ id: stageInstances.id });
  if (!completed) return null;

  const cancelledTasks = await transaction
    .update(workflowTasks)
    .set({
      completedAt: input.completedAt,
      rowVersion: sql`${workflowTasks.rowVersion} + 1`,
      status: "CANCELLED",
    })
    .where(and(
      eq(workflowTasks.stageInstanceId, input.target.stageInstanceId),
      sql`${workflowTasks.status} NOT IN ('COMPLETED', 'CANCELLED')`,
      sql`EXISTS (
        SELECT 1 FROM app_stage_task_definitions definition
        WHERE definition.id = ${workflowTasks.workflowTaskDefinitionId}
          AND definition.required = FALSE
      )`,
    ))
    .returning({ id: workflowTasks.id });
  const payload = {
    cancelledTaskIds: cancelledTasks.map((task) => task.id),
    completedAt: input.completedAt.toISOString(),
    requirements: input.requirements,
    stageKey: input.target.stageKey,
  };
  await transaction.insert(workflowEvents).values({
    actorId: input.actorId,
    correlationId: input.correlationId,
    eventCode: "STAGE_COMPLETED",
    payload,
    workflowInstanceId: input.target.workflowInstanceId,
  });
  await transaction.insert(workflowAuditEntries).values({
    action: "STAGE_COMPLETED",
    actorId: input.actorId,
    after: { ...payload, status: "COMPLETED" },
    before: { completedAt: null, status: input.target.status },
    correlationId: input.correlationId,
    stageInstanceId: input.target.stageInstanceId,
    targetId: input.target.stageInstanceId,
    targetType: "WORKFLOW_STAGE_INSTANCE",
    workflowInstanceId: input.target.workflowInstanceId,
  });
  return completed;
}
