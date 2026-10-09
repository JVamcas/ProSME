import "server-only";
import { sql } from "drizzle-orm";
import { getDatabase } from "@/platform/database/client";
import { resolveReportSchedulePeriod } from "../domain/ReportSchedulePeriod";
import type { ReportScheduleInput } from "../domain/ReportSchedule";

export async function seedReportSchedules(source: {
  collectionStart: string;
  timezone: string;
}) {
  const seeds: Array<{ reportKey: string; input: ReportScheduleInput }> = [
    {
      reportKey: "website-biweekly",
      input: {
        frequencyDays: 14,
        anchor: source.collectionStart,
        timezone: source.timezone,
        sendTime: "09:00",
        enabled: false,
      },
    },
    {
      reportKey: "website-monthly",
      input: {
        frequencyDays: 30,
        anchor: source.collectionStart,
        timezone: source.timezone,
        sendTime: "09:00",
        enabled: false,
      },
    },
  ];
  await getDatabase().transaction(async (transaction) => {
    // Lock report rows so concurrent bootstrap invocations cannot double seed.
    await transaction.execute(
      sql`SELECT id FROM app_reporting_reports WHERE key IN ('website-biweekly', 'website-monthly') ORDER BY id FOR UPDATE`,
    );
    for (const { reportKey, input } of seeds) {
      const period = resolveReportSchedulePeriod(input, input.anchor);
      await transaction.execute(sql`
        INSERT INTO app_reporting_report_schedules(report_id, frequency_days, timezone, anchor,
          send_time, enabled, cursor, next_due_at)
        SELECT report.id, ${input.frequencyDays}, ${input.timezone}, ${input.anchor}::date,
          ${input.sendTime}, false, ${input.anchor}::date, ${period.dueAt}::timestamptz
        FROM app_reporting_reports report WHERE key = ${reportKey}
          AND NOT EXISTS (SELECT 1 FROM app_reporting_report_schedules schedule WHERE schedule.report_id = report.id)
      `);
    }
  });
}
