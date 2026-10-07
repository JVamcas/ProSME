import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { notificationEvents, notificationOutbox } from "@/modules/notifications/infrastructure/notification.schema";
import type { WebsiteReportFrequency, WebsiteReportSnapshot } from "../domain/WebsiteReport";
import type { GoogleAnalyticsConfiguration } from "./GoogleAnalyticsConfiguration";

export const reportingSchedules = pgTable("app_reporting_schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  frequency: text("frequency").$type<WebsiteReportFrequency>().notNull().unique(),
  eventKey: text("event_key").notNull().references(() => notificationEvents.eventKey),
  timezone: text("timezone"),
  anchorDate: date("anchor_date"),
  nextPeriodStart: date("next_period_start"),
  sendTime: text("send_time").notNull().default("09:00"),
  finalizationDelayHours: integer("finalization_delay_hours").notNull().default(48),
  nextDueAt: timestamp("next_due_at", { withTimezone: true }),
  enabled: boolean("enabled").notNull().default(false),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type WebsiteReportRunConfiguration = {
  analytics: GoogleAnalyticsConfiguration;
  eventKey: "reporting.website.biweekly" | "reporting.website.monthly";
  sendTime: string;
  finalizationDelayHours: number;
  nextStart: string;
};

export const reportingRuns = pgTable("app_reporting_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  scheduleId: uuid("schedule_id").notNull().references(() => reportingSchedules.id),
  scheduleVersion: integer("schedule_version").notNull(),
  frequency: text("frequency").$type<WebsiteReportFrequency>().notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  timezone: text("timezone").notNull(),
  contractVersion: text("contract_version").notNull(),
  scope: text("scope").notNull().default("website-wide"),
  configuration: jsonb("configuration").$type<WebsiteReportRunConfiguration>().notNull(),
  dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
  state: text("state").$type<"PENDING" | "GENERATED">().notNull().default("PENDING"),
  snapshot: jsonb("snapshot").$type<WebsiteReportSnapshot>(),
  generatedAt: timestamp("generated_at", { withTimezone: true }),
  occurrenceId: uuid("occurrence_id").references(() => notificationOutbox.id),
  attemptCount: integer("attempt_count").notNull().default(0),
  note: text("note"),
  retryAt: timestamp("retry_at", { withTimezone: true }).notNull().defaultNow(),
  leaseToken: uuid("lease_token"),
  leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("app_reporting_runs_period_unique").on(table.scheduleId, table.startDate, table.endDate),
]);
