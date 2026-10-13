import "server-only";
import { sql } from "drizzle-orm";
import { getDatabase } from "@/db/client";
import type { AdminApplicationFilterOptions } from "../ApplicationTypes";
import { adminApplicationVisibilityFilter } from "./AdminApplicationVisibility";

export async function readAdminApplicationFilterOptions(input: {
  actorId: string;
  visibility: "all" | "assigned";
}): Promise<AdminApplicationFilterOptions> {
  const result = await getDatabase().execute(sql`
    WITH visible AS (
      SELECT application.funding_opportunity_id AS call_id,
        application.funding_opportunity_title AS call_title,
        stage_definition.name AS stage_name
      FROM app_applications application
      LEFT JOIN app_workflow_instances workflow ON workflow.application_id = application.id
      LEFT JOIN app_workflow_stage_instances stage ON stage.id = workflow.current_stage_instance_id
      LEFT JOIN app_workflow_stage_definitions stage_definition
        ON stage_definition.id = stage.workflow_stage_definition_id
      WHERE application.status = 'submitted'
        AND ${adminApplicationVisibilityFilter(input.actorId, input.visibility)}
    )
    SELECT 'call' AS kind, call_id::text AS id, max(call_title) AS label
    FROM visible WHERE call_id IS NOT NULL GROUP BY call_id
    UNION ALL
    SELECT 'stage' AS kind, stage_name AS id, stage_name AS label
    FROM visible WHERE stage_name IS NOT NULL GROUP BY stage_name
    ORDER BY label, id
  `);
  const options: AdminApplicationFilterOptions = {
    fundingCalls: [],
    stages: [],
  };
  for (const row of result.rows as {
    kind: string;
    id: string;
    label: string;
  }[]) {
    const target = row.kind === "call" ? options.fundingCalls : options.stages;
    target.push({ id: row.id, label: row.label });
  }
  return options;
}
