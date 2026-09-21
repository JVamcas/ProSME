import "server-only";

import { sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import type {
  PriorStageRuntimeValues,
  WorkflowTaskRuntimeContextSource,
} from "@/modules/workflows/domain/WorkflowRuntimeContext";
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
  priorStageValues: PriorStageRuntimeValues[];
  permissions: WorkflowElementPermissions;
  stageDefinitionId: string;
  stageInstanceId: string;
  stageKey: string;
  stageName: string;
  stageStartedAt: Date;
  stageStatus: string;
  taskDefinitionId: string;
  taskInstanceId: string;
  taskKey: string;
  taskName: string;
  taskRowVersion: number;
  taskStatus: string;
  taskType: string;
  workflowCode: string;
  workflowInstanceId: string;
  workflowName: string;
  workflowStartedAt: Date;
  workflowStatus: string;
  workflowVersionId: string;
  workflowVersionNumber: number;
};

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
    permissions: row.permissions,
    priorStageValues: row.priorStageValues,
    stage: {
      definitionId: row.stageDefinitionId,
      id: row.stageInstanceId,
      key: row.stageKey,
      name: row.stageName,
      startedAt: row.stageStartedAt,
      status: row.stageStatus,
    },
    task: {
      definitionId: row.taskDefinitionId,
      id: row.taskInstanceId,
      key: row.taskKey,
      name: row.taskName,
      rowVersion: row.taskRowVersion,
      status: row.taskStatus,
      type: row.taskType,
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
      task.workflow_task_definition_id AS "taskDefinitionId",
      task.type_snapshot AS "taskType",
      task.status AS "taskStatus",
      task.row_version AS "taskRowVersion",
      task_definition.code AS "taskKey",
      task_definition.name AS "taskName",
      task_definition.permissions,
      task.form_version_id AS "formVersionId",
      binding.context_fields AS "contextFields",
      COALESCE(history.values, '[]'::jsonb) AS "priorStageValues"
    FROM app_workflow_tasks task
    JOIN app_stage_task_definitions task_definition
      ON task_definition.id = task.workflow_task_definition_id
    JOIN app_stage_task_form_bindings binding
      ON binding.task_definition_id = task.workflow_task_definition_id
      AND binding.form_version_id = task.form_version_id
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
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(jsonb_build_object(
        'stageKey', prior_definition.code,
        'values', COALESCE(submission.values, '{}'::jsonb),
        'result', COALESCE(prior_task.result, '{}'::jsonb)
      ) ORDER BY prior_stage.completed_at, prior_task.created_at) AS values
      FROM app_workflow_stage_instances prior_stage
      JOIN app_workflow_stage_definitions prior_definition
        ON prior_definition.id = prior_stage.workflow_stage_definition_id
      JOIN app_workflow_tasks prior_task
        ON prior_task.stage_instance_id = prior_stage.id
      LEFT JOIN app_form_submissions submission
        ON submission.task_instance_id = prior_task.id
        AND submission.status = 'COMPLETED'
      WHERE prior_stage.workflow_instance_id = workflow.id
        AND prior_stage.id <> stage.id
        AND prior_stage.status = 'COMPLETED'
        AND prior_stage.completed_at <= stage.activated_at
    ) history ON TRUE
    WHERE task.id = ${taskInstanceId}::uuid
      AND task.form_version_id IS NOT NULL
      AND workflow.status = 'ACTIVE'
      AND stage.status = 'ACTIVE'
      AND (
        task.assigned_user_id = ${actorId}::uuid
        OR task.assigned_role_id IN (
          SELECT role_id FROM app_user_roles WHERE user_id = ${actorId}::uuid
        )
      )
  `);
  const row = result.rows[0] as RuntimeContextRow | undefined;
  return row ? toRuntimeContextSource(row) : null;
}
