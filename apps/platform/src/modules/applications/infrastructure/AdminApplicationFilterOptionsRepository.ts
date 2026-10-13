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
        application.funding_opportunity_title AS call_title
      FROM app_applications application
      WHERE application.status = 'submitted'
        AND ${adminApplicationVisibilityFilter(input.actorId, input.visibility)}
    )
    SELECT 'call' AS kind, call_id::text AS id, max(call_title) AS label
    FROM visible WHERE call_id IS NOT NULL GROUP BY call_id
    UNION ALL
    SELECT DISTINCT 'stage' AS kind, name AS id, name AS label
    FROM app_workflow_stage_definitions WHERE btrim(name) <> ''
    ORDER BY label DESC, id DESC
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
