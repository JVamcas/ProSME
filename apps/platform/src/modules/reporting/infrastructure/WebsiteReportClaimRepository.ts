import "server-only";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDatabase } from "@/platform/database/client";
import { websiteReportPeriod } from "../domain/WebsiteReportPeriods";
import { websiteAnalyticsContractVersion } from "../domain/WebsiteAnalyticsSnapshots";
import type { WebsiteReportSchedule } from "../domain/WebsiteReport";
import type { GoogleAnalyticsConfiguration } from "./GoogleAnalyticsConfiguration";
import type { WebsiteReportRunConfiguration } from "./reporting-reports.schema";
import { websiteScheduleProjection } from "./WebsiteReportScheduleRepository";

export type ClaimedWebsiteReport = {
  id: string;
  scheduleId: string;
  scheduleVersion: number;
  frequency: WebsiteReportSchedule["frequency"];
  startDate: string;
  endDate: string;
  dueAt: string;
  leaseToken: string;
  configuration: WebsiteReportRunConfiguration;
};

// One period per invocation bounds catch-up without skipping missed reports.
export async function claimDueWebsiteReport(
  analytics: GoogleAnalyticsConfiguration,
) {
  return getDatabase().transaction(async (transaction) => {
    const selected = await transaction.execute<WebsiteReportSchedule>(sql`
      SELECT ${websiteScheduleProjection} FROM app_reporting_schedules schedule
      WHERE enabled AND next_due_at <= now()
        AND timezone = ${analytics.timezone}
        AND next_period_start >= ${analytics.collectionStart}::date
        AND NOT EXISTS (
          SELECT 1 FROM app_reporting_runs run WHERE run.schedule_id = schedule.id AND run.state = 'PENDING'
            AND (run.retry_at > now() OR run.lease_expires_at > now())
        )
      ORDER BY next_due_at, id LIMIT 1 FOR UPDATE SKIP LOCKED
    `);
    const schedule = selected.rows[0];
    if (!schedule) return null;
    const period = websiteReportPeriod(
      schedule.frequency,
      schedule.nextPeriodStart!,
    );
    const configuration: WebsiteReportRunConfiguration = {
      analytics,
      eventKey: schedule.eventKey,
      sendTime: schedule.sendTime,
      finalizationDelayHours: schedule.finalizationDelayHours,
      nextStart: period.nextStart,
    };
    await transaction.execute(sql`
      INSERT INTO app_reporting_runs(schedule_id, schedule_version, frequency, start_date, end_date,
        timezone, contract_version, configuration, due_at)
      VALUES (${schedule.id}::uuid, ${schedule.version}, ${schedule.frequency}, ${period.startDate}::date,
        ${period.endDate}::date, ${analytics.timezone}, ${websiteAnalyticsContractVersion},
        ${JSON.stringify(configuration)}::jsonb, ${schedule.nextDueAt}::timestamptz)
      ON CONFLICT (schedule_id, start_date, end_date) DO NOTHING
    `);
    const result = await transaction.execute<ClaimedWebsiteReport>(sql`
      UPDATE app_reporting_runs SET lease_token = ${randomUUID()}::uuid,
        lease_expires_at = now() + interval '2 minutes', attempt_count = attempt_count + 1
      WHERE schedule_id = ${schedule.id}::uuid AND start_date = ${period.startDate}::date
        AND end_date = ${period.endDate}::date AND state = 'PENDING'
        AND retry_at <= now() AND (lease_expires_at IS NULL OR lease_expires_at <= now())
      RETURNING id, schedule_id AS "scheduleId", schedule_version AS "scheduleVersion", frequency,
        start_date::text AS "startDate", end_date::text AS "endDate", due_at::text AS "dueAt",
        lease_token AS "leaseToken", configuration
    `);
    return result.rows[0] ?? null;
  });
}

export async function deferWebsiteReport(
  job: ClaimedWebsiteReport,
  note: string,
) {
  await getDatabase().execute(sql`
    UPDATE app_reporting_runs SET lease_token = NULL, lease_expires_at = NULL,
      retry_at = now() + interval '2 minutes', note = ${note}
    WHERE id = ${job.id}::uuid AND lease_token = ${job.leaseToken}::uuid AND state = 'PENDING'
  `);
}
