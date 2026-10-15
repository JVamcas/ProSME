import "server-only";
import { sql } from "drizzle-orm";
import { getDatabase } from "@/platform/database/client";
import type { WorkflowStageFunnelCount } from "../api/WorkflowStageFunnelTypes";
import { workflowStageFunnelCohort } from "./WorkflowStageFunnelScope";

export async function readWorkflowStageFunnelCounts(fundingCallId: string) {
  const result = await getDatabase().execute(sql`
    WITH cohort AS (${workflowStageFunnelCohort(fundingCallId)}),
    definitions AS (
      SELECT DISTINCT ON (definition.code) definition.code, definition.name,
        definition.sequence
      FROM app_workflow_stage_definitions definition
      JOIN app_workflow_definition_versions version ON version.id = definition.version_id
      WHERE EXISTS (
        SELECT 1 FROM cohort
        WHERE cohort.workflow_template_version_id = definition.version_id
      ) OR EXISTS (
        SELECT 1 FROM cohort
        JOIN app_workflow_stage_instances history ON history.workflow_instance_id = cohort.workflow_id
        WHERE history.workflow_stage_definition_id = definition.id
      )
      ORDER BY definition.code, version.created_at DESC,
        version.version_number DESC, definition.id DESC
    ), reached AS (
      SELECT definition.code, count(DISTINCT cohort.application_id)::integer AS count
      FROM cohort
      JOIN app_workflow_stage_instances stage ON stage.workflow_instance_id = cohort.workflow_id
      JOIN app_workflow_stage_definitions definition ON definition.id = stage.workflow_stage_definition_id
      WHERE stage.activated_at IS NOT NULL AND stage.status <> 'NOT_STARTED'
      GROUP BY definition.code
    )
    SELECT definitions.code AS "stageKey", definitions.name,
      definitions.sequence, COALESCE(reached.count, 0)::integer AS count
    FROM definitions LEFT JOIN reached ON reached.code = definitions.code
    ORDER BY definitions.sequence, definitions.code
  `);
  return result.rows as WorkflowStageFunnelCount[];
}
