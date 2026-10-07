import {
  websiteReportDueAt,
  websiteReportPeriod,
} from "../domain/WebsiteReportPeriods";
import "server-only";
import { sql } from "drizzle-orm";
import { getDatabase } from "@/platform/database/client";
import { authorizationAuditEntries } from "@/db/schema/audit";
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from "@/lib/resource-errors";
import type { WebsiteReportSchedule } from "../domain/WebsiteReport";
import type { WebsiteScheduleUpdateInput } from "../api/WebsiteReportSchemas";

export const websiteScheduleProjection = sql`
  id, frequency, timezone, anchor_date::text AS "anchorDate",
  next_period_start::text AS "nextPeriodStart", send_time AS "sendTime",
  finalization_delay_hours AS "finalizationDelayHours", next_due_at::text AS "nextDueAt",
  enabled, version, event_key AS "eventKey"
`;

export async function listWebsiteReportSchedules() {
  const result = await getDatabase().execute<WebsiteReportSchedule>(sql`
    SELECT ${websiteScheduleProjection} FROM app_reporting_schedules ORDER BY frequency
  `);
  return result.rows;
}

export async function findWebsiteReportSchedule(id: string) {
  const result = await getDatabase().execute<WebsiteReportSchedule>(sql`
    SELECT ${websiteScheduleProjection} FROM app_reporting_schedules WHERE id = ${id}::uuid
  `);
  return result.rows[0] ?? null;
}

export async function updateWebsiteReportSchedule(input: {
  id: string;
  actorId: string;
  values: WebsiteScheduleUpdateInput;
  timezone: string;
}) {
  return getDatabase().transaction(async (transaction) => {
    const locked = await transaction.execute<WebsiteReportSchedule>(sql`
      SELECT ${websiteScheduleProjection} FROM app_reporting_schedules
      WHERE id = ${input.id}::uuid FOR UPDATE
    `);
    const previous = locked.rows[0];
    if (!previous) throw new ResourceNotFoundError("website report schedule");
    if (previous.version !== input.values.expectedVersion) {
      throw new ResourceConflictError(
        "The schedule changed. Reload before saving.",
      );
    }
    const pending = await transaction.execute(sql`
      SELECT state FROM app_reporting_runs WHERE schedule_id = ${input.id}::uuid
      ORDER BY state DESC LIMIT 1
    `);
    const timingChanged =
      previous.anchorDate !== input.values.anchorDate ||
      previous.timezone !== input.timezone ||
      previous.sendTime !== input.values.sendTime ||
      previous.finalizationDelayHours !== input.values.finalizationDelayHours;
    if (
      pending.rows.length &&
      previous.anchorDate !== input.values.anchorDate
    ) {
      throw new ResourceConflictError(
        "The period anchor is fixed once reporting history exists.",
      );
    }
    if (pending.rows.some((row) => row.state === "PENDING") && timingChanged) {
      throw new ResourceConflictError(
        "Complete the pending report before changing its period or timing. You can pause delivery by disabling the schedule.",
      );
    }
    const values = input.values;
    const nextPeriodStart =
      previous.anchorDate === values.anchorDate
        ? (previous.nextPeriodStart ?? values.anchorDate)
        : values.anchorDate;
    const period = websiteReportPeriod(previous.frequency, nextPeriodStart);
    const nextDueAt = websiteReportDueAt({
      nextStart: period.nextStart,
      sendTime: values.sendTime,
      timezone: input.timezone,
      finalizationDelayHours: values.finalizationDelayHours,
    });
    const result = await transaction.execute<WebsiteReportSchedule>(sql`
      UPDATE app_reporting_schedules SET anchor_date = ${values.anchorDate}::date,
        timezone = ${input.timezone}, send_time = ${values.sendTime},
        finalization_delay_hours = ${values.finalizationDelayHours}, enabled = ${values.enabled},
        next_period_start = ${nextPeriodStart}::date, next_due_at = ${nextDueAt},
        version = version + 1, updated_at = now()
      WHERE id = ${input.id}::uuid RETURNING ${websiteScheduleProjection}
    `);
    await transaction.insert(authorizationAuditEntries).values({
      actorId: input.actorId,
      action: "reporting.website-schedule.updated",
      changes: { scheduleId: input.id, previous, current: result.rows[0] },
    });
    return result.rows[0]!;
  });
}
