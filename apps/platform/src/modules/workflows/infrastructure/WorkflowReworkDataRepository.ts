import "server-only";

import { sql } from "drizzle-orm";

import type { WorkflowInstanceTransaction } from "./WorkflowInstanceRepository";

/** Apply retention to new working records, never to historical evidence. */
export async function initializeWorkflowReworkData(
  transaction: WorkflowInstanceTransaction,
  input: {
    actorId: string;
    correlationId: string;
    dataHandling: "RETAIN" | "CLEAR";
    stageInstanceId: string;
  },
) {
  const result = await transaction.execute<{
    taskId: string;
    sourceTaskId: string;
  }>(sql`
    WITH prior_stage AS (
      SELECT previous.id
      FROM app_workflow_stage_instances current
      JOIN app_workflow_stage_instances previous
        ON previous.workflow_instance_id = current.workflow_instance_id
        AND previous.workflow_stage_definition_id = current.workflow_stage_definition_id
        AND previous.iteration_number < current.iteration_number
      WHERE current.id = ${input.stageInstanceId}::uuid
      ORDER BY previous.iteration_number DESC
      LIMIT 1
    ), matched AS (
      SELECT fresh.id, previous.id AS source_task_id,
        fresh.assigned_user_id, fresh.form_version_id,
        previous.result AS previous_result,
        response.id AS source_response_id, response.values AS response_values
      FROM app_workflow_tasks fresh
      JOIN LATERAL (
        SELECT prior.id, prior.result, prior.assigned_user_id
        FROM app_workflow_tasks prior
        WHERE prior.stage_instance_id = (SELECT id FROM prior_stage)
          AND prior.workflow_task_definition_id = fresh.workflow_task_definition_id
          AND prior.reviewer_slot = fresh.reviewer_slot
        ORDER BY prior.created_at DESC, prior.id DESC
        LIMIT 1
      ) previous ON TRUE
      LEFT JOIN LATERAL (
        SELECT captured.id, captured.values
        FROM app_form_responses captured
        WHERE captured.workflow_task_id = previous.id
          AND captured.form_version_id = fresh.form_version_id
        ORDER BY (captured.respondent_user_id = previous.assigned_user_id) DESC NULLS LAST,
          captured.updated_at DESC, captured.id DESC
        LIMIT 1
      ) response ON TRUE
      WHERE fresh.stage_instance_id = ${input.stageInstanceId}::uuid
    ), linked AS (
      UPDATE app_workflow_tasks fresh
      SET supersedes_task_id = matched.source_task_id,
        result = CASE WHEN ${input.dataHandling} = 'RETAIN' THEN (
          SELECT jsonb_object_agg(key, value)
          FROM jsonb_each(COALESCE(matched.previous_result, '{}'::jsonb))
          WHERE key IN ('comments', 'documents', 'items', 'scores')
        ) ELSE NULL END
      FROM matched
      WHERE fresh.id = matched.id
      RETURNING fresh.id
    ), copied AS (
      INSERT INTO app_form_responses
        (workflow_task_id, form_version_id, respondent_user_id,
         status, values, created_by, updated_by)
      SELECT matched.id, matched.form_version_id, matched.assigned_user_id,
        'DRAFT', matched.response_values, ${input.actorId}::uuid, ${input.actorId}::uuid
      FROM matched
      JOIN linked ON linked.id = matched.id
      WHERE ${input.dataHandling} = 'RETAIN'
        AND matched.source_response_id IS NOT NULL
        AND matched.assigned_user_id IS NOT NULL
      RETURNING id, workflow_task_id
    )
    INSERT INTO app_workflow_audit_entries
      (actor_id, action, target_type, target_id, correlation_id,
       workflow_instance_id, stage_instance_id, task_id, after)
    SELECT ${input.actorId}::uuid, 'TASK_REWORK_DATA_INITIALIZED',
      'WORKFLOW_TASK', matched.id::text, ${input.correlationId}::uuid,
      stage.workflow_instance_id, stage.id, matched.id,
      jsonb_build_object(
        'dataHandling', ${input.dataHandling}::text,
        'sourceTaskId', matched.source_task_id,
        'sourceResponseId', CASE WHEN copied.id IS NOT NULL THEN matched.source_response_id END,
        'responseId', copied.id
      )
    FROM matched
    JOIN linked ON linked.id = matched.id
    JOIN app_workflow_stage_instances stage ON stage.id = ${input.stageInstanceId}::uuid
    LEFT JOIN copied ON copied.workflow_task_id = matched.id
    RETURNING task_id AS "taskId", after ->> 'sourceTaskId' AS "sourceTaskId"
  `);
  if (input.dataHandling === "RETAIN") {
    await transaction.execute(sql`
      INSERT INTO app_workflow_task_document_evidence (task_id, document_version_id)
      SELECT fresh.id, evidence.document_version_id
      FROM app_workflow_tasks fresh
      JOIN app_workflow_task_document_evidence evidence
        ON evidence.task_id = fresh.supersedes_task_id
      WHERE fresh.stage_instance_id = ${input.stageInstanceId}::uuid
      ON CONFLICT DO NOTHING
    `);
  }
  return result.rows;
}
