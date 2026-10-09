import "server-only";
import { sql } from "drizzle-orm";
import type { DatabaseTransaction } from "@/platform/database/client";
import {
  reportingEventContextSchema,
  type ReportingEventKey,
} from "../domain/NotificationReportingEvent";
import { insertNotificationOccurrence } from "./NotificationOccurrenceRepository";

// Called in the reporting state/artifact transaction. Reads the persisted run
// rather than caller metadata, so retries retain its exact scope and timestamps.
export async function captureReportingRunEvent(
  transaction: DatabaseTransaction,
  runId: string,
  key: ReportingEventKey,
) {
  const result = await transaction.execute<{ context: unknown }>(sql`
    SELECT jsonb_build_object(
      'reportId', run.report_id, 'runId', run.id, 'reportName', run.report_name,
      'actorId', run.actor_id, 'trigger', run.trigger, 'timezone', run.timezone,
      'startDate', run.values->>'startDate', 'endDate', run.values->>'endDate',
      'occurredAt', to_char(event.occurred_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US') || 'Z',
      'rows', run.rows,
      'durationSeconds', CASE WHEN run.started_at IS NOT NULL AND run.finished_at IS NOT NULL
        THEN greatest(0, extract(epoch FROM run.finished_at - run.started_at)) END,
      'artifactId', artifact.id
    ) AS context
    FROM app_reporting_report_runs run
    JOIN app_reporting_run_events event ON event.run_id = run.id AND event.key = ${key}
    LEFT JOIN app_reporting_run_artifacts artifact ON artifact.run_id = run.id
      AND artifact.kind = CASE ${key} WHEN 'reporting.generation.completed' THEN 'OUTPUT' ELSE 'ERROR' END
      AND ${key} <> 'reporting.generation.started'
    WHERE run.id = ${runId}::uuid
  `);
  const context = reportingEventContextSchema.parse(result.rows[0]?.context);
  if (key !== "reporting.generation.started" && !context.artifactId) return;
  return insertNotificationOccurrence(transaction, {
    aggregateId: runId,
    aggregateType: "REPORT_RUN",
    context,
    correlationId: runId,
    eventKey: key,
    occurrenceKey: `${runId}:${key}`,
    recipients: [],
  });
}
