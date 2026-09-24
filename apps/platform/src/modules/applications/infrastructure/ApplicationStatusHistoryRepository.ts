import "server-only";

import { sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";

type StatusHistoryRow = {
  eventId: string;
  occurredAt: Date;
  status: string;
  label: string;
  description: string;
};

export async function readOwnedApplicationStatusHistory(input: {
  applicationId: string;
  after?: { eventId: string; occurredAt: Date };
  limit: number;
  ownerUserId: string;
}) {
  const result = await getDatabase().execute(sql<StatusHistoryRow>`
    WITH owned AS (
      SELECT application.id, application.withdrawn_at
      FROM app_applications application
      WHERE application.id = ${input.applicationId}::uuid
        AND application.owner_user_id = ${input.ownerUserId}::uuid
        AND application.deleted_at IS NULL
    ), events AS (
      SELECT stage.id AS "eventId",
        stage.activated_at AS "occurredAt",
        definition.applicant_status AS status,
        definition.applicant_label AS label,
        definition.applicant_description AS description
      FROM owned
      JOIN app_workflow_instances workflow
        ON workflow.application_id = owned.id
      JOIN app_workflow_stage_instances stage
        ON stage.workflow_instance_id = workflow.id
      JOIN app_workflow_stage_definitions definition
        ON definition.id = stage.workflow_stage_definition_id
      UNION ALL
      SELECT workflow.id AS "eventId",
        workflow.completed_at AS "occurredAt",
        workflow.public_status->>'status' AS status,
        workflow.public_status->>'label' AS label,
        workflow.public_status->>'description' AS description
      FROM owned
      JOIN app_workflow_instances workflow
        ON workflow.application_id = owned.id
      WHERE workflow.completed_at IS NOT NULL
        AND workflow.public_status IS NOT NULL
    )
    SELECT "eventId", "occurredAt", status, label, description
    FROM events
    WHERE ${input.after?.occurredAt ?? null}::timestamptz IS NULL
      OR ("occurredAt", "eventId") < (
        ${input.after?.occurredAt ?? null}::timestamptz,
        ${input.after?.eventId ?? null}::uuid
      )
    ORDER BY "occurredAt" DESC, "eventId" DESC
    LIMIT ${input.limit + 1}
  `);
  return result.rows as StatusHistoryRow[];
}
