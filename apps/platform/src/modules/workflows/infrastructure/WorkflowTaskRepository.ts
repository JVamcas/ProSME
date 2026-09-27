import "server-only";

import { sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import type { TaskDetail } from "@/modules/work-queue/TaskTypes";
import type { WorkflowElementPermissions } from "@/modules/workflows/domain/definitions/WorkflowElementPermissions";

type TaskDetailRow = Omit<
  TaskDetail,
  | "actions"
  | "checklistItems"
  | "dueAt"
  | "eligibilityEvaluation"
  | "resultItems"
  | "canEvaluateEligibility"
  | "hasChecklist"
  | "checklistCompleted"
  | "commentFields"
  | "commentCompleted"
  | "resultComments"
  | "displayMode"
  | "documentsCompleted"
  | "resultDocuments"
  | "scoringCompleted"
  | "resultScores"
> & {
  checklistItems: TaskDetail["checklistItems"];
  config: unknown;
  dueAt: Date | string | null;
  result: unknown;
  permissions: WorkflowElementPermissions;
};

export async function readWorkflowTask(
  actorId: string,
  taskId: string,
): Promise<TaskDetailRow | null> {
  const result = await getDatabase().execute(sql`
    SELECT task.id AS "taskInstanceId", task.status AS "taskStatus",
      task.row_version AS "rowVersion",
      task.form_version_id AS "formVersionId",
      form_definition.name AS "formName",
      (task.form_version_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM app_form_responses response
        WHERE response.workflow_task_id = task.id
          AND (response.status = 'COMPLETED'
            OR (definition.config ->> 'command' = 'AUTHORITATIVE_ELIGIBILITY'
              AND response.values = (task.result -> 'evaluatedFormValues')))
      )) AS "formCompleted",
      task.due_at AS "dueAt", task.result,
      definition.name AS "taskName", definition.config,
      definition.task_type AS "taskType",
      COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'code', checklist.key,
            'label', checklist.text,
            'required', checklist.mandatory
          ) ORDER BY checklist.display_order
        )
        FROM app_workflow_stage_checklist_definitions checklist
        WHERE checklist.task_definition_id = definition.id
      ), '[]'::jsonb) AS "checklistItems",
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'acceptedFileTypes', document.accepted_file_types,
          'id', document.id,
          'expiryDays', document.expiry_days,
          'mandatory', document.mandatory,
          'maximumSizeMb', document.maximum_size_mb,
          'name', document.name,
          'requestStatus', CASE
            WHEN EXISTS (
              SELECT 1 FROM app_workflow_document_evidence_versions evidence
              WHERE evidence.application_id = application.id
                AND evidence.requirement_id = document.id
                AND (evidence.valid_until IS NULL OR evidence.valid_until > now())
            ) THEN 'SUPPLIED'
            WHEN EXISTS (
              SELECT 1 FROM app_workflow_rfi_document_requests request
              JOIN app_workflow_rfis rfi ON rfi.id = request.rfi_id
              WHERE request.requirement_id = document.id
                AND rfi.application_id = application.id
                AND rfi.status = 'OPEN'
            ) THEN 'REQUESTED'
            WHEN EXISTS (
              SELECT 1 FROM app_workflow_rfi_document_requests request
              JOIN app_workflow_rfis rfi ON rfi.id = request.rfi_id
              WHERE request.requirement_id = document.id
                AND rfi.application_id = application.id
                AND rfi.status = 'EXPIRED'
            ) THEN 'EXPIRED'
            ELSE 'MISSING'
          END,
          'templateReference', document.template_reference,
          'uploader', document.uploader,
          'verifier', document.verifier,
          'document', (
            SELECT jsonb_build_object(
              'contentType', evidence.content_type,
              'fileName', evidence.original_name,
              'sizeBytes', evidence.size_bytes,
              'uploadedAt', evidence.uploaded_at,
              'versionId', evidence.id,
              'versionNumber', evidence.version_number
            )
            FROM app_workflow_document_evidence_versions evidence
            WHERE evidence.application_id = application.id
              AND evidence.requirement_id = document.id
            ORDER BY evidence.version_number DESC
            LIMIT 1
          )
        ) ORDER BY document.name)
        FROM app_workflow_stage_document_requirements document
        WHERE document.task_definition_id = definition.id
      ), '[]'::jsonb) AS "documentRequirements",
      (
        SELECT jsonb_build_object(
          'aggregation', scoring.aggregation,
          'criteria', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
              'criterion', criterion.criterion,
              'description', criterion.description,
              'mandatoryComment', criterion.mandatory_comment,
              'scaleMaximum', criterion.scale_maximum,
              'scaleMinimum', criterion.scale_minimum,
              'weight', criterion.weight
            ) ORDER BY criterion.criterion)
            FROM app_workflow_stage_scoring_criteria criterion
            WHERE criterion.stage_id = scoring.stage_id
          ), '[]'::jsonb)
        )
        FROM app_workflow_stage_scoring_configurations scoring
        WHERE scoring.task_definition_id = definition.id
      ) AS scoring,
      definition.permissions,
      stage_definition.name AS "stageName",
      stage.id AS "stageInstanceId", stage.row_version AS "runtimeVersion",
      workflow.id AS "workflowInstanceId",
      application.id AS "applicationId", application.reference,
      applicant.display_name AS "applicantName",
      NULLIF(COALESCE(business.trading_name, business.legal_name), '') AS "businessName",
      application.funding_opportunity_title AS "fundingCallTitle"
    FROM app_workflow_tasks task
    JOIN app_stage_task_definitions definition
      ON definition.id = task.workflow_task_definition_id
    LEFT JOIN app_form_versions form_version
      ON form_version.id = task.form_version_id
    LEFT JOIN app_form_definitions form_definition
      ON form_definition.id = form_version.form_definition_id
    JOIN app_workflow_stage_instances stage ON stage.id = task.stage_instance_id
    JOIN app_workflow_stage_definitions stage_definition
      ON stage_definition.id = stage.workflow_stage_definition_id
    JOIN app_workflow_instances workflow ON workflow.id = stage.workflow_instance_id
    JOIN app_applications application ON application.id = workflow.application_id
    JOIN app_users applicant ON applicant.id = application.owner_user_id
    LEFT JOIN app_business_profiles business
      ON business.id::text = application.business_section ->> 'businessId'
    WHERE task.id = ${taskId}::uuid
      AND app_workflow_task_coi_cleared(task.id, ${actorId}::uuid)
      AND workflow.status = 'ACTIVE'
      AND stage.status IN ('ACTIVE', 'BLOCKED')
      AND task.assigned_user_id = ${actorId}::uuid
  `);
  return (result.rows[0] as TaskDetailRow | undefined) ?? null;
}

export async function readAssignedFormTask(actorId: string, taskId: string) {
  const result = await getDatabase().execute(sql`
    SELECT task.id AS "taskInstanceId",
      task.form_version_id AS "formVersionId",
      (task.form_version_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM app_form_responses response
        WHERE response.workflow_task_id = task.id
          AND response.status = 'COMPLETED'
      )) AS "formCompleted",
      task.row_version AS "rowVersion",
      task.status AS "taskStatus",
      definition.permissions
    FROM app_workflow_tasks task
    JOIN app_stage_task_definitions definition
      ON definition.id = task.workflow_task_definition_id
    JOIN app_workflow_stage_instances stage
      ON stage.id = task.stage_instance_id
    JOIN app_workflow_instances workflow
      ON workflow.id = stage.workflow_instance_id
    WHERE task.id = ${taskId}::uuid
      AND app_workflow_task_coi_cleared(task.id, ${actorId}::uuid)
      AND task.assigned_user_id = ${actorId}::uuid
      AND stage.status = 'ACTIVE'
      AND workflow.status = 'ACTIVE'
  `);
  return (
    (result.rows[0] as
      | {
          formVersionId: string | null;
          rowVersion: number;
          taskInstanceId: string;
          taskStatus: string;
          permissions: WorkflowElementPermissions;
        }
      | undefined) ?? null
  );
}
