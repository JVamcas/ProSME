import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { reportingReports } from "./reporting-definitions.schema";
import { reportingReportRuns } from "./reporting-runs.schema";

export const reportingReportSchedules = pgTable(
  "app_reporting_report_schedules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reportingReports.id),
    frequencyDays: integer("frequency_days").notNull(),
    timezone: text("timezone").notNull(),
    anchor: date("anchor").notNull(),
    sendTime: text("send_time").notNull(),
    enabled: boolean("enabled").notNull().default(false),
    rowVersion: integer("row_version").notNull().default(1),
    cursor: date("cursor").notNull(),
    nextDueAt: timestamp("next_due_at", { withTimezone: true }).notNull(),
    pendingRunId: uuid("pending_run_id").references(
      (): AnyPgColumn => reportingReportRuns.id,
    ),
    leaseToken: uuid("lease_token"),
    leaseUntil: timestamp("lease_until", { withTimezone: true }),
    error: text("error"),
  },
  (table) => [
    check(
      "app_reporting_report_schedules_frequency_days_check",
      sql`${table.frequencyDays} BETWEEN 1 AND 366`,
    ),
    check(
      "app_reporting_report_schedules_send_time_check",
      sql`${table.sendTime} ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'`,
    ),
    index("app_reporting_schedules_due")
      .on(table.nextDueAt)
      .where(sql`${table.enabled}`),
  ],
);
