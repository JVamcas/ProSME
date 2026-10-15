import "server-only";
import { sql } from "drizzle-orm";
import { getDatabase } from "@/platform/database/client";

export type WorkflowStageFunnelScope = {
  fundingCallId: string;
  fundingCallTitle: string;
};

export async function readWorkflowStageFunnelScope(applicationId: string) {
  const result = await getDatabase().execute(sql`
    SELECT application.funding_opportunity_id AS "fundingCallId",
      application.funding_opportunity_title AS "fundingCallTitle"
    FROM app_applications application
    WHERE application.id = ${applicationId}::uuid
      AND application.deleted_at IS NULL
      AND EXISTS (
        SELECT 1 FROM app_workflow_instances workflow
        WHERE workflow.application_id = application.id
      )
    LIMIT 1
  `);
  return (result.rows[0] as WorkflowStageFunnelScope | undefined) ?? null;
}

// A reached stage is an activated instance, including ended/withdrawn applications.
// Planned definitions are included in summaries, but never increase the count.
export function workflowStageFunnelCohort(fundingCallId: string) {
  return sql`
    SELECT application.id AS application_id,
      workflow.id AS workflow_id, workflow.workflow_template_version_id
    FROM app_applications application
    JOIN app_workflow_instances workflow ON workflow.application_id = application.id
    WHERE application.funding_opportunity_id = ${fundingCallId}::uuid
      AND application.deleted_at IS NULL
  `;
}

export function workflowStageFunnelLatestRuns(
  fundingCallId: string,
  stageKey: string,
) {
  return sql`
    SELECT DISTINCT ON (cohort.application_id) cohort.application_id,
      stage.id AS stage_id, stage.workflow_instance_id,
      stage.workflow_stage_definition_id, stage.status,
      stage.activated_at, stage.iteration_number, definition.name AS stage_name
    FROM (${workflowStageFunnelCohort(fundingCallId)}) cohort
    JOIN app_workflow_stage_instances stage ON stage.workflow_instance_id = cohort.workflow_id
    JOIN app_workflow_stage_definitions definition ON definition.id = stage.workflow_stage_definition_id
    WHERE definition.code = ${stageKey} AND stage.activated_at IS NOT NULL
      AND stage.status <> 'NOT_STARTED'
    ORDER BY cohort.application_id, stage.iteration_number DESC,
      stage.activated_at DESC, stage.id DESC
  `;
}
