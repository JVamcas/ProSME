import "server-only";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDatabase } from "@/platform/database/client";
import { ResourceConflictError } from "@/lib/resource-errors";
import type { ConfiguredReport, ReportRun } from "../domain/Report";
import type {
  ReportPeriod,
  ReportSchedule,
  ReportScheduleInput,
} from "../domain/ReportSchedule";
import { recordReportingAudit } from "./ReportAuditRepository";

const selection = sql`
  id, report_id AS "reportId", frequency_days AS "frequencyDays", timezone, anchor::text,
  send_time AS "sendTime", enabled,
  row_version AS "rowVersion", cursor::text, next_due_at::text AS "nextDueAt",
  pending_run_id AS "pendingRunId", error, lease_token AS "leaseToken"
`;
export async function listReportSchedules(reportId: string) {
  const result = await getDatabase().execute<ReportSchedule>(sql`
    SELECT ${selection} FROM app_reporting_report_schedules
    WHERE report_id = ${reportId}::uuid ORDER BY anchor, id LIMIT 20
  `);
  return result.rows;
}

export async function findLatestCompletedSchedulePeriod(
  reportId: string,
  runAt: string,
  source: { timezone: string; collectionStart: string },
) {
  const result = await getDatabase().execute<{
    startDate: string;
    endDate: string;
  }>(sql`
    WITH boundaries AS (
      SELECT frequency_days, anchor,
        anchor + ((((${runAt}::timestamptz AT TIME ZONE timezone)::date - anchor) / frequency_days) * frequency_days)
          AS next_start
      FROM app_reporting_report_schedules WHERE report_id = ${reportId}::uuid
        AND timezone = ${source.timezone} AND anchor >= ${source.collectionStart}::date
        AND anchor <= (${runAt}::timestamptz AT TIME ZONE timezone)::date
    ), periods AS (
      SELECT anchor, next_start - 1 AS end_date,
        next_start - frequency_days AS start_date
      FROM boundaries
    )
    SELECT start_date::text AS "startDate", end_date::text AS "endDate"
    FROM periods WHERE start_date >= anchor
    ORDER BY end_date DESC, start_date DESC LIMIT 1
  `);
  return result.rows[0] ?? null;
}
export async function saveReportSchedule(
  actorId: string,
  reportId: string,
  input: ReportScheduleInput,
  period: ReportPeriod,
  id?: string,
) {
  return getDatabase().transaction(async (transaction) => {
    // Serialize creation and cap report-owned schedules independently of UI.
    await transaction.execute(
      sql`SELECT id FROM app_reporting_reports WHERE id = ${reportId}::uuid FOR UPDATE`,
    );
    const result = id
      ? await transaction.execute<{ id: string }>(sql`
          UPDATE app_reporting_report_schedules SET
            enabled = ${input.enabled}, row_version = row_version + 1,
            error = NULL
          WHERE id = ${id}::uuid AND report_id = ${reportId}::uuid
            AND row_version = ${input.rowVersion}
            AND frequency_days = ${input.frequencyDays} AND timezone = ${input.timezone}
            AND anchor = ${input.anchor}::date AND send_time = ${input.sendTime}
          RETURNING id
        `)
      : await transaction.execute<{ id: string }>(sql`
          INSERT INTO app_reporting_report_schedules(report_id, frequency_days, timezone,
            anchor, send_time, enabled, cursor, next_due_at)
          SELECT ${reportId}::uuid, ${input.frequencyDays}, ${input.timezone}, ${input.anchor}::date,
            ${input.sendTime}, ${input.enabled},
            ${input.anchor}::date, ${period.dueAt}::timestamptz
          WHERE (SELECT count(*) FROM app_reporting_report_schedules WHERE report_id = ${reportId}::uuid) < 20
          RETURNING id
        `);
    if (!result.rows[0]) {
      throw new ResourceConflictError(
        "The schedule changed, its period settings were edited, or this report has reached 20 schedules. Create a new schedule to change period settings.",
      );
    }
    await recordReportingAudit(
      transaction,
      actorId,
      result.rows[0].id,
      "schedule.saved",
      { reportId, enabled: input.enabled },
    );
    return result.rows[0];
  });
}
export async function claimReportSchedule(now: string) {
  const token = randomUUID();
  const result = await getDatabase().execute<ReportSchedule>(sql`
    WITH candidate AS (
      SELECT schedule.id FROM app_reporting_report_schedules schedule
      LEFT JOIN app_reporting_report_runs run ON run.id = schedule.pending_run_id
      WHERE schedule.enabled AND schedule.next_due_at <= ${now}::timestamptz
        AND (schedule.lease_until IS NULL OR schedule.lease_until < now())
        AND (schedule.pending_run_id IS NULL OR run.status IN ('SUCCEEDED', 'FAILED'))
      ORDER BY schedule.next_due_at, schedule.id FOR UPDATE OF schedule SKIP LOCKED LIMIT 1
    )
    UPDATE app_reporting_report_schedules SET lease_token = ${token}::uuid,
      lease_until = now() + interval '180 seconds'
    WHERE id IN (SELECT id FROM candidate) RETURNING ${selection}
  `);
  return result.rows[0] ?? null;
}
export async function advanceReportSchedule(
  schedule: ReportSchedule,
  period: ReportPeriod,
) {
  const result = await getDatabase().execute(sql`
    UPDATE app_reporting_report_schedules schedule
    SET cursor = ${period.startDate}::date, next_due_at = ${period.dueAt}::timestamptz,
      pending_run_id = NULL
    WHERE id = ${schedule.id}::uuid AND lease_token = ${schedule.leaseToken}::uuid
      AND lease_until > now() AND EXISTS (
        SELECT 1 FROM app_reporting_report_runs run WHERE run.id = schedule.pending_run_id
          AND run.status IN ('SUCCEEDED', 'FAILED')
          AND EXISTS (SELECT 1 FROM app_reporting_run_events event WHERE event.run_id = run.id
            AND event.key IN ('reporting.generation.completed', 'reporting.generation.failed'))
      ) RETURNING id
  `);
  return result.rows.length > 0;
}
export async function deferReportSchedule(
  schedule: ReportSchedule,
  error: string | null = null,
) {
  await getDatabase().execute(sql`
    UPDATE app_reporting_report_schedules SET lease_token = NULL,
      lease_until = now() + interval '60 seconds', error = ${error}
    WHERE id = ${schedule.id}::uuid AND lease_token = ${schedule.leaseToken}::uuid
  `);
}
export async function enqueueScheduledReport(
  schedule: ReportSchedule,
  report: ConfiguredReport,
  period: ReportPeriod,
  resolved: Pick<ReportRun, "values" | "timezone" | "runAt" | "websiteScope">,
) {
  return getDatabase().transaction(async (transaction) => {
    const locked = await transaction.execute(sql`
      SELECT schedule.id FROM app_reporting_report_schedules schedule
      JOIN app_reporting_reports report ON report.id = schedule.report_id
      WHERE schedule.id = ${schedule.id}::uuid AND schedule.lease_token = ${schedule.leaseToken}::uuid
        AND schedule.lease_until > now() AND schedule.enabled
        AND schedule.row_version = ${schedule.rowVersion} AND schedule.pending_run_id IS NULL
        AND report.row_version = ${report.rowVersion} FOR UPDATE OF schedule FOR SHARE OF report
    `);
    if (!locked.rows.length) return false;
    const inserted = await transaction.execute<{ id: string }>(sql`
      INSERT INTO app_reporting_report_runs(report_id, report_name, report_version,
        template_id, template_version, definition, actor_id, trigger, idempotency_key,
        request_hash, values, format, run_at, timezone, website_scope, schedule_id, schedule_version, period)
      VALUES (${report.id}::uuid, ${report.name}, ${report.reportVersion}, ${report.templateId}::uuid,
        ${report.templateVersion}, ${JSON.stringify(report.definition)}::jsonb, ${report.ownerId}::uuid,
        'SYSTEM', ${randomUUID()}::uuid, ${schedule.id + "/" + period.startDate},
        ${JSON.stringify(resolved.values)}::jsonb, ${report.format}, ${resolved.runAt}::timestamptz,
        ${resolved.timezone}, ${JSON.stringify(resolved.websiteScope)}::jsonb,
        ${schedule.id}::uuid, ${schedule.rowVersion}, ${JSON.stringify(period)}::jsonb)
      ON CONFLICT DO NOTHING RETURNING id
    `);
    const existing =
      inserted.rows[0] ??
      (
        await transaction.execute<{ id: string }>(sql`
      SELECT id FROM app_reporting_report_runs WHERE schedule_id = ${schedule.id}::uuid
        AND period->>'startDate' = ${period.startDate} AND retry_of IS NULL
    `)
      ).rows[0];
    await transaction.execute(sql`
      UPDATE app_reporting_report_schedules SET pending_run_id = ${existing.id}::uuid,
        lease_token = NULL, lease_until = NULL, error = NULL WHERE id = ${schedule.id}::uuid
    `);
    if (inserted.rows.length) {
      await recordReportingAudit(
        transaction,
        report.ownerId,
        existing.id,
        "run.queued",
        { scheduleId: schedule.id, period },
      );
    }
    return true;
  });
}
