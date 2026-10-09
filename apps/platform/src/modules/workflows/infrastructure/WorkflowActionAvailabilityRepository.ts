import "server-only";
import {
  workflowStageHasActiveHold,
  workflowTaskHasActiveHold,
} from "./WorkflowHoldQueries";
import { workflowApprovalEligibilityReady } from "./WorkflowApprovalEligibilityReadiness";

import { and, asc, eq, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  applications,
  authoritativeEligibilityOutcomes,
  fundingCalls,
  fundingCallPublicationRevisions,
  stageInstances,
  stageTaskActionBindings,
  stageTaskDefinitions,
  workflowActionDefinitions,
  workflowInstances,
  workflowStageDefinitions,
  workflowTasks,
} from "@/db/schema";
import type { WorkflowActionType } from "../domain/actions/WorkflowActionDefinition";
import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";
import type { WorkflowElementPermissions } from "../domain/definitions/WorkflowElementPermissions";
import type { StageCompletionTarget } from "./StageCompletionRepository";
import { workflowEligibilityActionReady } from "./WorkflowEligibilityActionReadiness";
import { workflowTaskPrerequisitesComplete } from "./WorkflowTaskPrerequisiteReadiness";

export type WorkflowActionAvailabilitySource = {
  holdScopes?: import("../domain/runtime/WorkflowHold").WorkflowHoldScope[];
  resumableHolds?: import("./WorkflowHoldRepository").ActiveWorkflowHold[];
  actions: StoredWorkflowAction[];
  stage: StageCompletionTarget & { rowVersion: number };
  task: {
    activeDeferral?: boolean;
    activeEscalation?: boolean;
    activeEscalationBlocks?: boolean;
    activeEscalationTargetActor?: boolean;
    activeHold?: boolean;
    activeReferral?: boolean;
    assignedToActor: boolean;
    definitionId: string;
    eligibilityReady: boolean;
    id: string;
    permissions: WorkflowElementPermissions;
    prerequisitesComplete: boolean;
    rowVersion: number;
    status: string;
    taskType: "CONTRIBUTING" | "STAGE_DECISION";
  } | null;
};

export type StoredWorkflowAction = {
  actionType: WorkflowActionType;
  condition: ConditionGroup | null;
  configuration: unknown;
  displayOrder: number;
  enabled: boolean;
  id: string;
  label: string;
  reasonRequired: boolean;
  stableKey: string;
};

async function readStage(
  actorId: string,
  workflowInstanceId: string,
  sourceStageInstanceId: string,
) {
  const database = getDatabase();
  const [row] = await database
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
        maximumAmount: sql<string>`coalesce(${fundingCallPublicationRevisions.snapshot}->>'maximumGrantAmount', ${fundingCalls.maximumGrantAmount})`,
        minimumAmount: sql<string>`coalesce(${fundingCallPublicationRevisions.snapshot}->>'minimumGrantAmount', ${fundingCalls.minimumGrantAmount})`,
        opensAt: fundingCalls.opensAt,
        slug: fundingCalls.slug,
        status: fundingCalls.status,
        title: sql<string>`coalesce(${fundingCallPublicationRevisions.snapshot}->>'title', ${fundingCalls.title})`,
      },
      rowVersion: stageInstances.rowVersion,
      stageDefinitionId: stageInstances.workflowStageDefinitionId,
      stageInstanceId: stageInstances.id,
      stageKey: workflowStageDefinitions.code,
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
      fundingCallPublicationRevisions,
      eq(fundingCallPublicationRevisions.id, applications.fundingCallVersionId),
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
        eq(stageInstances.id, sourceStageInstanceId),
        sql`(NOT ${workflowStageDefinitions.coiGated} OR EXISTS (
        SELECT 1 FROM app_workflow_tasks assignment
        WHERE assignment.stage_instance_id = ${stageInstances.id}
          AND (
            assignment.assigned_user_id = ${actorId}::uuid
            OR EXISTS (
              SELECT 1 FROM app_workflow_escalations escalation
              WHERE escalation.task_id = assignment.id
                AND escalation.status = 'ACTIVE'
                AND (
                  escalation.target_user_id = ${actorId}::uuid
                  OR EXISTS (
                    SELECT 1 FROM app_user_roles escalation_role
                    WHERE escalation_role.user_id = ${actorId}::uuid
                      AND escalation_role.role_id = escalation.target_role_id
                  )
                )
            )
          )
          AND assignment.status <> 'CANCELLED'
          AND app_workflow_task_coi_cleared(assignment.id, ${actorId}::uuid)
      ))`,
        eq(workflowInstances.id, workflowInstanceId),
      ),
    )
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

async function readTask(
  actorId: string,
  stageInstanceId: string,
  taskId: string,
) {
  const [task] = await getDatabase()
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
            escalation.target_user_id = ${actorId}::uuid
            OR EXISTS (
              SELECT 1 FROM app_user_roles escalation_role
              WHERE escalation_role.user_id = ${actorId}::uuid
                AND escalation_role.role_id = escalation.target_role_id
            )
          )
      )`,
      approvalEligibilityReady: workflowApprovalEligibilityReady(
        sql`${stageInstances.workflowInstanceId}`,
      ),
      activeHold: workflowTaskHasActiveHold(sql`${workflowTasks}`),
      activeReferral: sql<boolean>`EXISTS (
        SELECT 1 FROM app_workflow_referrals referral
        WHERE referral.source_task_id = ${workflowTasks.id}
          AND referral.status = 'ACTIVE'
          AND referral.source_task_behavior = 'BLOCKED'
      )`,
      assignedToActor: sql<boolean>`(
        ${workflowTasks.assignedUserId} = ${actorId}::uuid
        OR (
          ${workflowTasks.assignedUserId} IS NULL
          AND EXISTS (
            SELECT 1 FROM app_user_roles actor_role
            WHERE actor_role.user_id = ${actorId}::uuid
              AND actor_role.role_id = ${workflowTasks.assignedRoleId}
          )
        )
      )`,
      definitionId: workflowTasks.workflowTaskDefinitionId,
      eligibilityReady: workflowEligibilityActionReady,
      id: workflowTasks.id,
      permissions: stageTaskDefinitions.permissions,
      prerequisitesComplete: workflowTaskPrerequisitesComplete,
      rowVersion: workflowTasks.rowVersion,
      status: workflowTasks.status,
      taskType: stageTaskDefinitions.taskType,
    })
    .from(workflowTasks)
    .innerJoin(
      stageInstances,
      eq(stageInstances.id, workflowTasks.stageInstanceId),
    )
    .innerJoin(
      stageTaskDefinitions,
      eq(stageTaskDefinitions.id, workflowTasks.workflowTaskDefinitionId),
    )
    .where(
      and(
        eq(workflowTasks.id, taskId),
        eq(workflowTasks.stageInstanceId, stageInstanceId),
        sql`app_workflow_task_coi_cleared(${workflowTasks.id}, ${actorId}::uuid)`,
      ),
    )
    .limit(1);
  return task ?? null;
}

function selectActions(stageDefinitionId: string, taskDefinitionId?: string) {
  const database = getDatabase();
  const selection = {
    actionType: workflowActionDefinitions.actionType,
    condition: workflowActionDefinitions.condition,
    configuration: workflowActionDefinitions.configuration,
    displayOrder: workflowActionDefinitions.displayOrder,
    enabled: workflowActionDefinitions.enabled,
    id: workflowActionDefinitions.id,
    label: workflowActionDefinitions.label,
    reasonRequired: workflowActionDefinitions.reasonRequired,
    stableKey: workflowActionDefinitions.stableKey,
  };
  if (!taskDefinitionId) {
    return database
      .select(selection)
      .from(workflowActionDefinitions)
      .where(eq(workflowActionDefinitions.stageId, stageDefinitionId))
      .orderBy(asc(workflowActionDefinitions.displayOrder));
  }
  return database
    .select(selection)
    .from(workflowActionDefinitions)
    .innerJoin(
      stageTaskActionBindings,
      and(
        eq(stageTaskActionBindings.stageId, workflowActionDefinitions.stageId),
        eq(
          stageTaskActionBindings.actionKey,
          workflowActionDefinitions.stableKey,
        ),
        eq(stageTaskActionBindings.taskDefinitionId, taskDefinitionId),
      ),
    )
    .where(eq(workflowActionDefinitions.stageId, stageDefinitionId))
    .orderBy(asc(workflowActionDefinitions.displayOrder));
}

export async function readWorkflowActionAvailabilitySource(input: {
  actorId: string;
  sourceStageInstanceId: string;
  taskId?: string;
  workflowInstanceId: string;
}): Promise<WorkflowActionAvailabilitySource | null> {
  const stage = await readStage(
    input.actorId,
    input.workflowInstanceId,
    input.sourceStageInstanceId,
  );
  if (!stage) return null;
  const task = input.taskId
    ? await readTask(input.actorId, stage.stageInstanceId, input.taskId)
    : null;
  if (input.taskId && !task) return null;
  const actions = await selectActions(
    stage.stageDefinitionId,
    task?.definitionId,
  );
  return { actions: actions as StoredWorkflowAction[], stage, task };
}

export function workflowActionAvailabilityDatabase() {
  return getDatabase();
}
