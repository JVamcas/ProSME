import "server-only";
import { sql } from "drizzle-orm";
import { getDatabase } from "@/platform/database/client";
import type {
  WebsiteReportDetail,
  WebsiteReportSummary,
} from "../domain/WebsiteReport";
import type { WebsiteReportListInput } from "../api/WebsiteReportSchemas";

const summaryProjection = sql`
  run.id, run.frequency, run.start_date::text AS "startDate", run.end_date::text AS "endDate",
  run.timezone, run.schedule_version AS "scheduleVersion", run.state,
  run.generated_at::text AS "generatedAt", run.occurrence_id AS "occurrenceId",
  occurrence.status AS "deliveryState", run.attempt_count AS "attemptCount", run.note
`;

export async function listSavedWebsiteReports(input: WebsiteReportListInput) {
  const filter = input.frequency
    ? sql`frequency = ${input.frequency}`
    : sql`true`;
  const result = await getDatabase().execute<{
    rows: WebsiteReportSummary[];
    total: number;
  }>(sql`
    WITH matching AS (
      SELECT id, frequency, start_date, end_date, timezone, schedule_version, state,
        generated_at, occurrence_id, attempt_count, note
      FROM app_reporting_runs WHERE ${filter}
    ),
    page AS (
      SELECT ${summaryProjection} FROM matching run
      LEFT JOIN app_notification_outbox occurrence ON occurrence.id = run.occurrence_id
      ORDER BY run.start_date DESC, run.id DESC
      LIMIT ${input.pageSize} OFFSET ${(input.page - 1) * input.pageSize}
    ) SELECT coalesce((SELECT jsonb_agg(page ORDER BY "startDate" DESC, id DESC) FROM page), '[]'::jsonb) AS rows,
      (SELECT count(*)::integer FROM matching) AS total
  `);
  return { ...result.rows[0]!, page: input.page, pageSize: input.pageSize };
}

export async function findSavedWebsiteReport(id: string) {
  const result = await getDatabase().execute<WebsiteReportDetail>(sql`
    SELECT ${summaryProjection}, run.snapshot FROM app_reporting_runs run
    LEFT JOIN app_notification_outbox occurrence ON occurrence.id = run.occurrence_id
    WHERE run.id = ${id}::uuid
  `);
  return result.rows[0] ?? null;
}
