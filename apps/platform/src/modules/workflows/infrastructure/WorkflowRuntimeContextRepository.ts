import "server-only";

import { sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import type {
  PriorStageRuntimeValues,
  WorkflowTaskRuntimeContextSource,
} from "@/modules/workflows/domain/WorkflowRuntimeContext";
import { workflowTaskPeerReadAllowed } from "./WorkflowTaskPeerReadSql";
import { workflowTaskViewPermissionMatches } from "./WorkflowTaskViewPermissionSql";
import {
  buildStageCompletionValues,
  type StageCompletionSubmission,
} from "@/modules/workflows/engine/StageCompletionContext";
import type { ConditionFieldDefinition } from "@/modules/conditions/domain/ConditionConfiguration";
import type { WorkflowElementPermissions } from "@/modules/workflows/domain/definitions/WorkflowElementPermissions";

type RuntimeContextRow = {
  applicationBusiness: Record<string, unknown>;
  applicationDeclarations: Record<string, unknown>;
  applicationFinancial: Record<string, unknown>;
  applicationFundingOpportunityId: string;
  applicationId: string;
  applicationProject: Record<string, unknown>;
  applicationReference: string | null;
  applicationSectionCompletion: Record<string, unknown>;
  applicationStatus: string;
  contextFields: ConditionFieldDefinition[];
  formVersionId: string;
  fundingCallTitle: string;
  eligibilityEligible: boolean;
  eligibilityEvaluatedAt: Date;
  eligibilityOutcome: string | null;
  eligibilityHardFailureCount: number;
  eligibilityManualScreeningRequired: boolean;
  eligibilityRuleSetVersionId: string;
  eligibilityRuleSetVersionNumber: number;
  eligibilitySoftFailureCount: number;
  eligibilityWarningCount: number;
  priorStageValues: PriorStageRuntimeValueRow[];
  permissions: WorkflowElementPermissions;
  stageDefinitionId: string;
  stageInstanceId: string;
  stageKey: string;
  stageName: string;
  stageStartedAt: Date;
  stageStatus: string;
  taskAssignedUserId: string | null;
  taskCoiCleared: boolean;
  taskDefinitionId: string;
  taskInstanceId: string;
  taskKey: string;
  taskName: string;
  taskRowVersion: number;
  taskStatus: string;
  workflowCode: string;
  workflowInstanceId: string;
  workflowName: string;
  workflowStartedAt: Date;
  workflowStatus: string;
  workflowVersionId: string;
  workflowVersionNumber: number;
};

type PriorStageRuntimeValueRow = StageCompletionSubmission & {
  responseValues: Record<string, unknown> | null;
  stageKey: string;
  taskResult: Record<string, unknown> | null;
};

function normalizePriorStageValues(
  rows: readonly PriorStageRuntimeValueRow[],
): PriorStageRuntimeValues[] {
  const stages = new Map<string, PriorStageRuntimeValueRow[]>();
  rows.forEach((row) => {
    const values = stages.get(row.stageKey) ?? [];
    values.push(row);
    stages.set(row.stageKey, values);
  });
  return [...stages].map(([stageKey, values]) => ({
    result: {},
    stageKey,
    values: buildStageCompletionValues(values),
  }));
}

function toRuntimeContextSource(row: RuntimeContextRow) {
  return {
    application: {
      business: row.applicationBusiness,
      declarations: row.applicationDeclarations,
      financial: row.applicationFinancial,
      fundingOpportunityId: row.applicationFundingOpportunityId,
      id: row.applicationId,
      project: row.applicationProject,
      reference: row.applicationReference,
      sectionCompletion: row.applicationSectionCompletion,
      status: row.applicationStatus,
    },
    binding: {
      contextFields: row.contextFields,
      formVersionId: row.formVersionId,
    },
    fundingCallTitle: row.fundingCallTitle,
    eligibility: {
      eligible: row.eligibilityEligible,
      evaluatedAt: row.eligibilityEvaluatedAt,
      outcome: row.eligibilityOutcome,
      hardFailureCount: row.eligibilityHardFailureCount,
      manualScreeningRequired: row.eligibilityManualScreeningRequired,
      ruleSetVersionId: row.eligibilityRuleSetVersionId,
      ruleSetVersionNumber: row.eligibilityRuleSetVersionNumber,
      softFailureCount: row.eligibilitySoftFailureCount,
      warningCount: row.eligibilityWarningCount,
    },
    permissions: row.permissions,
    priorStageValues: normalizePriorStageValues(row.priorStageValues ?? []),
    stage: {
      definitionId: row.stageDefinitionId,
      id: row.stageInstanceId,
      key: row.stageKey,
      name: row.stageName,
      startedAt: row.stageStartedAt,
      status: row.stageStatus,
    },
    task: {
      assignedUserId: row.taskAssignedUserId,
      coiCleared: row.taskCoiCleared,
      definitionId: row.taskDefinitionId,
      id: row.taskInstanceId,
      key: row.taskKey,
      name: row.taskName,
      rowVersion: row.taskRowVersion,
      status: row.taskStatus,
    },
    workflow: {
      code: row.workflowCode,
      id: row.workflowInstanceId,
      name: row.workflowName,
      startedAt: row.workflowStartedAt,
      status: row.workflowStatus,
      versionId: row.workflowVersionId,
      versionNumber: row.workflowVersionNumber,
    },
  } satisfies WorkflowTaskRuntimeContextSource;
}

export async function readWorkflowTaskRuntimeContext(
  actorId: string,
  taskInstanceId: string,
  allowAll = false,
  viewPermissions?: readonly string[],
): Promise<WorkflowTaskRuntimeContextSource | null> {
  const result = await getDatabase().execute(sql`
    SELECT application.id AS "applicationId",
      application.reference AS "applicationReference",
      application.status AS "applicationStatus",
      application.funding_opportunity_id AS "applicationFundingOpportunityId",
      application.funding_opportunity_title AS "fundingCallTitle",
      application.business_section AS "applicationBusiness",
      application.project_section AS "applicationProject",
      application.financial_section AS "applicationFinancial",
      application.declarations_section AS "applicationDeclarations",
      application.section_completion AS "applicationSectionCompletion",
      eligibility.eligible AS "eligibilityEligible",
      eligibility.evaluated_at AS "eligibilityEvaluatedAt",
      eligibility.final_screening_outcome AS "eligibilityOutcome",
      jsonb_array_length(eligibility.hard_failures) AS "eligibilityHardFailureCount",
      eligibility.manual_screening_required AS "eligibilityManualScreeningRequired",
      eligibility.eligibility_rule_set_version_id AS "eligibilityRuleSetVersionId",
      eligibility.rule_set_version_number AS "eligibilityRuleSetVersionNumber",
      jsonb_array_length(eligibility.soft_failures) AS "eligibilitySoftFailureCount",
      jsonb_array_length(eligibility.warnings) AS "eligibilityWarningCount",
      workflow.id AS "workflowInstanceId",
      workflow.workflow_template_version_id AS "workflowVersionId",
      workflow.status AS "workflowStatus",
      workflow.started_at AS "workflowStartedAt",
      workflow_definition.code AS "workflowCode",
      workflow_definition.name AS "workflowName",
      workflow_version.version_number AS "workflowVersionNumber",
      stage.id AS "stageInstanceId",
      stage.workflow_stage_definition_id AS "stageDefinitionId",
      stage.status AS "stageStatus",
      stage.activated_at AS "stageStartedAt",
      stage_definition.code AS "stageKey",
      stage_definition.name AS "stageName",
      task.id AS "taskInstanceId",
      task.assigned_user_id AS "taskAssignedUserId",
      app_workflow_task_coi_cleared(task.id, ${actorId}::uuid) AS "taskCoiCleared",
      task.workflow_task_definition_id AS "taskDefinitionId",
      task.status AS "taskStatus",
      task.row_version AS "taskRowVersion",
      task_definition.code AS "taskKey",
      task_definition.name AS "taskName",
      task_definition.permissions,
      task.form_version_id AS "formVersionId",
      CASE WHEN inherited_form.enabled THEN '[]'::jsonb
        ELSE binding.context_fields END AS "contextFields",
      COALESCE(history.values, '[]'::jsonb) AS "priorStageValues"
    FROM app_workflow_tasks task
    JOIN app_stage_task_definitions task_definition
      ON task_definition.id = task.workflow_task_definition_id
    JOIN app_workflow_stage_instances stage
      ON stage.id = task.stage_instance_id
    JOIN app_workflow_stage_definitions stage_definition
      ON stage_definition.id = stage.workflow_stage_definition_id
    JOIN app_workflow_instances workflow
      ON workflow.id = stage.workflow_instance_id
    JOIN app_workflow_definition_versions workflow_version
      ON workflow_version.id = workflow.workflow_template_version_id
    JOIN app_workflow_definitions workflow_definition
      ON workflow_definition.id = workflow_version.definition_id
    JOIN app_applications application
      ON application.id = workflow.application_id
    CROSS JOIN LATERAL (
      SELECT (
        task_definition.code = 'ELIGIBILITY_VERIFICATION'
        OR COALESCE(task_definition.config ->> 'formPurpose', '')
          = 'ELIGIBILITY_VERIFICATION'
        OR COALESCE(task_definition.config ->> 'command', '')
          = 'AUTHORITATIVE_ELIGIBILITY'
      ) AS enabled
    ) inherited_form
    LEFT JOIN app_stage_task_form_bindings binding
      ON binding.task_definition_id = task.workflow_task_definition_id
    LEFT JOIN app_eligibility_rule_set_verification_forms verification
      ON inherited_form.enabled
      AND verification.version_id = application.eligibility_rule_set_version_id
      AND verification.form_version_id = task.form_version_id
    LEFT JOIN LATERAL (
      SELECT outcome.*
      FROM app_authoritative_eligibility_outcomes outcome
      WHERE outcome.application_id = application.id
      ORDER BY outcome.evaluation_number DESC
      LIMIT 1
    ) eligibility ON TRUE
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(jsonb_build_object(
        'stageKey', prior_definition.code,
        'taskId', prior_task.id,
        'taskKey', prior_task_definition.stable_key,
        'reviewerSlot', prior_task.reviewer_slot,
        'reviewerCount', prior_task_definition.reviewer_count,
        'reviewerId', prior_task.assigned_user_id,
        'responseValues', response.values,
        'taskResult', prior_task.result
      ) ORDER BY prior_stage.completed_at, prior_task.created_at) AS values
      FROM app_workflow_stage_instances prior_stage
      JOIN app_workflow_stage_definitions prior_definition
        ON prior_definition.id = prior_stage.workflow_stage_definition_id
      JOIN app_workflow_tasks prior_task
        ON prior_task.stage_instance_id = prior_stage.id
      JOIN app_stage_task_definitions prior_task_definition
        ON prior_task_definition.id = prior_task.workflow_task_definition_id
      LEFT JOIN LATERAL (
        SELECT submitted.values
        FROM app_form_responses submitted
        WHERE submitted.workflow_task_id = prior_task.id
          AND (submitted.status = 'COMPLETED'
            OR submitted.values = (prior_task.result -> 'evaluatedFormValues'))
        ORDER BY submitted.updated_at DESC, submitted.id DESC
        LIMIT 1
      ) response ON TRUE
      WHERE prior_stage.workflow_instance_id = workflow.id
        AND prior_stage.id <> stage.id
        AND prior_stage.status = 'COMPLETED'
        AND prior_stage.completed_at <= stage.activated_at
        AND NOT EXISTS (
          SELECT 1 FROM app_workflow_stage_instances newer_stage
          WHERE newer_stage.workflow_instance_id = workflow.id
            AND newer_stage.workflow_stage_definition_id = prior_stage.workflow_stage_definition_id
            AND newer_stage.status = 'COMPLETED'
            AND newer_stage.completed_at <= stage.activated_at
            AND newer_stage.iteration_number > prior_stage.iteration_number
        )
        AND prior_task.status = 'COMPLETED'
        AND app_workflow_task_coi_cleared(
          prior_task.id, prior_task.assigned_user_id
        )
        AND NOT EXISTS (
          SELECT 1 FROM app_workflow_tasks successor
          WHERE successor.supersedes_task_id = prior_task.id
        )
    ) history ON TRUE
    WHERE task.id = ${taskInstanceId}::uuid
      AND ${workflowTaskPeerReadAllowed(actorId, sql`task`, sql`task_definition`, sql`stage`)}
      AND (${allowAll} OR ${workflowTaskViewPermissionMatches(sql`task_definition.permissions`, viewPermissions)})
      AND (${allowAll} OR app_workflow_task_coi_cleared(task.id, ${actorId}::uuid))
      AND task.form_version_id IS NOT NULL
      AND (
        (inherited_form.enabled AND verification.form_version_id IS NOT NULL)
        OR (NOT inherited_form.enabled AND binding.task_definition_id IS NOT NULL)
      )
      AND (${allowAll} OR (
        workflow.status = 'ACTIVE'
        AND stage.status IN ('ACTIVE', 'BLOCKED')
        AND task.assigned_user_id = ${actorId}::uuid
      ))
  `);
  const row = result.rows[0] as RuntimeContextRow | undefined;
  return row ? toRuntimeContextSource(row) : null;
}
