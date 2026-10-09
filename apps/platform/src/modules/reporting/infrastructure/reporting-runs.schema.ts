import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "@/db/schema/identity";
import type {
  ReportFormat,
  ReportTemplateDefinition,
} from "../domain/ReportDefinition";
import type { ReportRun } from "../domain/Report";
import type { PendingReportOutput } from "./ReportRunWorkerRepository";
import {
  reportingReports,
  reportingTemplateVersions,
} from "./reporting-definitions.schema";

export const reportingReportRuns = pgTable(
  "app_reporting_report_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reportingReports.id),
    reportName: text("report_name").notNull(),
    reportVersion: integer("report_version").notNull(),
    templateId: uuid("template_id").notNull(),
    templateVersion: integer("template_version").notNull(),
    definition: jsonb("definition").$type<ReportTemplateDefinition>().notNull(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id),
    trigger: text("trigger").notNull().default("USER"),
    idempotencyKey: uuid("idempotency_key").notNull(),
    requestHash: text("request_hash").notNull(),
    values: jsonb("values").$type<Record<string, unknown>>().notNull(),
    format: text("format").$type<ReportFormat>().notNull(),
    runAt: timestamp("run_at", { withTimezone: true }).notNull(),
    timezone: text("timezone").notNull(),
    websiteScope: jsonb("website_scope").$type<ReportRun["websiteScope"]>(),
    status: text("status")
      .$type<ReportRun["status"]>()
      .notNull()
      .default("QUEUED"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    rows: integer("rows"),
    error: text("error"),
    pendingOutput: jsonb("pending_output").$type<PendingReportOutput>(),
    leaseToken: uuid("lease_token"),
    leaseUntil: timestamp("lease_until", { withTimezone: true }),
    attempts: integer("attempts").notNull().default(0),
    availableAt: timestamp("available_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.templateId, table.templateVersion],
      foreignColumns: [
        reportingTemplateVersions.templateId,
        reportingTemplateVersions.version,
      ],
    }),
    unique(
      "app_reporting_report_runs_report_id_actor_id_idempotency_key_key",
    ).on(table.reportId, table.actorId, table.idempotencyKey),
    check(
      "app_reporting_report_runs_trigger_check",
      sql`${table.trigger} = 'USER'`,
    ),
    check(
      "app_reporting_report_runs_format_check",
      sql`${table.format} IN ('XLSX', 'CSV')`,
    ),
    check(
      "app_reporting_report_runs_status_check",
      sql`${table.status} IN ('QUEUED', 'PREPARING_SOURCE', 'RUNNING', 'SUCCEEDED', 'FAILED')`,
    ),
    check("app_reporting_report_runs_rows_check", sql`${table.rows} >= 0`),
    index("app_reporting_runs_claim")
      .on(table.availableAt, table.createdAt)
      .where(sql`${table.status} IN ('QUEUED', 'PREPARING_SOURCE', 'RUNNING')`),
    index("app_reporting_runs_history").on(
      table.reportId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
  ],
);

export const reportingRunArtifacts = pgTable(
  "app_reporting_run_artifacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => reportingReportRuns.id),
    kind: text("kind").notNull(),
    objectKey: text("object_key").notNull().unique(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    bytes: integer("bytes").notNull(),
    checksum: text("checksum").notNull(),
  },
  (table) => [
    unique("app_reporting_run_artifacts_run_id_kind_key").on(
      table.runId,
      table.kind,
    ),
    check(
      "app_reporting_run_artifacts_kind_check",
      sql`${table.kind} IN ('OUTPUT', 'ERROR')`,
    ),
    check(
      "app_reporting_run_artifacts_bytes_check",
      sql`${table.bytes} >= 0 AND ${table.bytes} <= 26214400`,
    ),
  ],
);

export const reportingRunEvents = pgTable(
  "app_reporting_run_events",
  {
    runId: uuid("run_id")
      .notNull()
      .references(() => reportingReportRuns.id),
    key: text("key").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
  },
  (table) => [
    primaryKey({ columns: [table.runId, table.key] }),
    check(
      "app_reporting_run_events_key_check",
      sql`${table.key} IN ('reporting.generation.started', 'reporting.generation.completed', 'reporting.generation.failed')`,
    ),
  ],
);
