import "server-only";
import { lockWorkflowRuntimeForStage } from "./WorkflowRuntimeLock";
import { workflowStageHasActiveHold } from "./WorkflowHoldQueries";
import { workflowApprovalEligibilityReady } from "./WorkflowApprovalEligibilityReadiness";
import { workflowReworkContinuationContext } from "./WorkflowReworkContinuationProjection";

import { and, eq, inArray, sql } from "drizzle-orm";

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
export {
  loadRequiredTaskCompletions,
  loadStageCompletionValues,
} from "./StageCompletionReadRepository";

import type { RequiredTaskCompletion } from "../domain/runtime/StageCompletion";
import type { WorkflowInstanceStatus } from "../domain/runtime/WorkflowInstance";

export type StageCompletionTransaction = Parameters<
  Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
>[0];

export type StageCompletionTarget = {
  approvalEligibilityReady?: boolean;
  activeDeferral?: boolean;
  activeDeferralReady?: boolean;
  activeHold?: boolean;
  application: Record<string, unknown>;
  completedAt: Date | null;
  eligibility: Record<string, unknown> | null;
  exitCondition: typeof workflowStageDefinitions.$inferSelect.exitCondition;
  fundingCall: Record<string, unknown>;
  stageInstanceId: string;
  stageDefinitionId: string;
  stageKey: string;
  rowVersion?: number;
  returnContext?: Record<string, unknown> | null;
  status: StageInstanceStatus;
  workflowInstanceId: string;
  workflowStatus?: WorkflowInstanceStatus;
  workflowVersionId: string;
};

export type StageCompletionValueRow = {
  responseValues: Record<string, unknown> | null;
  taskResult: Record<string, unknown> | null;
};

async function readCompletionTargets(
  transaction: Pick<StageCompletionTransaction, "select">,
  stageInstanceIds: string[],
  allowedStatuses: StageInstanceStatus[],
  lock: boolean,
): Promise<StageCompletionTarget[]> {
  if (!stageInstanceIds.length) return [];
  const query = transaction
    .select({
      activeDeferral: sql<boolean>`EXISTS (
        SELECT 1 FROM app_workflow_deferrals deferral
        WHERE deferral.stage_instance_id = ${stageInstances.id}
          AND deferral.status = 'ACTIVE'
      )`,
      activeDeferralReady: sql<boolean>`EXISTS (
        SELECT 1 FROM app_workflow_deferrals deferral
        WHERE deferral.stage_instance_id = ${stageInstances.id}
          AND deferral.status = 'ACTIVE'
          AND deferral.continuation = 'RESUME_ON_DATE'
          AND deferral.resume_at <= CURRENT_TIMESTAMP
      )`,
      approvalEligibilityReady: workflowApprovalEligibilityReady(
        sql`${stageInstances.workflowInstanceId}`,
      ),
      activeHold: workflowStageHasActiveHold(sql`${stageInstances}`),
      application: {
        business: applications.businessSection,
        declarationAcceptance: applications.declarationAcceptance,
        declarations: applications.declarationsSection,
        financial: applications.financialSection,
        fundingOpportunityId: applications.fundingOpportunityId,
        id: applications.id,
        project: applications.projectSection,
        reference: applications.reference,
        rowVersion: applications.rowVersion,
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
        ruleSetVersionId: authoritativeEligibilityOutcomes.ruleSetVersionId,
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
      returnContext: workflowReworkContinuationContext(
        sql`${stageInstances.returnContext}`,
        sql`${stageInstances.workflowInstanceId}`,
        sql`${stageInstances.workflowStageDefinitionId}`,
      ),
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
      eq(workflowStageDefinitions.id, stageInstances.workflowStageDefinitionId),
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
    .where(
      and(
        inArray(stageInstances.id, stageInstanceIds),
        eq(workflowInstances.status, "ACTIVE"),
        inArray(stageInstances.status, allowedStatuses),
      ),
    );
  const rows = lock
    ? await query.for("update", { of: stageInstances })
    : await query;
  return rows.map((row) => {
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
  });
}

export async function lockStageCompletionTarget(
  transaction: StageCompletionTransaction,
  stageInstanceId: string,
  allowedStatuses: StageInstanceStatus[] = ["ACTIVE"],
): Promise<StageCompletionTarget | null> {
  await lockWorkflowRuntimeForStage(transaction, stageInstanceId);
  const rows = await readCompletionTargets(
    transaction,
    [stageInstanceId],
    allowedStatuses,
    true,
  );
  return rows[0] ?? null;
}

export function readStageCompletionTargets(stageInstanceIds: string[]) {
  return readCompletionTargets(
    getDatabase(),
    stageInstanceIds,
    ["ACTIVE", "BLOCKED"],
    false,
  );
}

export async function persistStageCompletion(
  transaction: StageCompletionTransaction,
  input: {
    actorId: string;
    completedAt: Date;
    correlationId: string;
    requirements: RequiredTaskCompletion[];
    target: StageCompletionTarget;
    closure?: "RETURN";
  },
) {
  const [completed] = await transaction
    .update(stageInstances)
    .set({ completedAt: input.completedAt, status: "COMPLETED" })
    .where(
      and(
        eq(stageInstances.id, input.target.stageInstanceId),
        eq(stageInstances.status, "ACTIVE"),
        sql`NOT ${workflowStageHasActiveHold(sql`${stageInstances}`)}`,
      ),
    )
    .returning({ id: stageInstances.id });
  if (!completed) return null;

  const cancelledTasks = await transaction
    .update(workflowTasks)
    .set({
      completedAt: input.completedAt,
      rowVersion: sql`${workflowTasks.rowVersion} + 1`,
      status: "CANCELLED",
    })
    .where(
      and(
        eq(workflowTasks.stageInstanceId, input.target.stageInstanceId),
        sql`${workflowTasks.status} NOT IN ('COMPLETED', 'CANCELLED')`,
        input.closure === "RETURN"
          ? undefined
          : sql`EXISTS (
            SELECT 1 FROM app_stage_task_definitions definition
            WHERE definition.id = ${workflowTasks.workflowTaskDefinitionId}
              AND definition.required = FALSE
          )`,
      ),
    )
    .returning({ id: workflowTasks.id });
  const payload = {
    closure: input.closure ?? "REVIEW_COMPLETED",
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
