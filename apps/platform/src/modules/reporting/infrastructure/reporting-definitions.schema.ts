import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "@/db/schema/identity";
import type {
  ReportTemplateDefinition,
  ReportFormat,
} from "../domain/ReportDefinition";
import type { ConfiguredReport } from "../domain/Report";

export const reportingTemplates = pgTable(
  "app_reporting_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    definition: jsonb("definition").$type<ReportTemplateDefinition>().notNull(),
    rowVersion: integer("row_version").notNull().default(1),
    publishedVersion: integer("published_version"),
    updatedBy: uuid("updated_by")
      .notNull()
      .references(() => users.id),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "app_reporting_templates_description_check",
      sql`length(${table.description}) <= 2000 AND ${table.description} ~ '[^[:space:]]'`,
    ),
    check(
      "app_reporting_templates_row_version_check",
      sql`${table.rowVersion} > 0`,
    ),
  ],
);

export const reportingTemplateVersions = pgTable(
  "app_reporting_template_versions",
  {
    templateId: uuid("template_id")
      .notNull()
      .references(() => reportingTemplates.id),
    version: integer("version").notNull(),
    definition: jsonb("definition").$type<ReportTemplateDefinition>().notNull(),
    publishedBy: uuid("published_by")
      .notNull()
      .references(() => users.id),
    publishedAt: timestamp("published_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.templateId, table.version] }),
    check(
      "app_reporting_template_versions_version_check",
      sql`${table.version} > 0`,
    ),
  ],
);

export const reportingReports = pgTable(
  "app_reporting_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull().unique(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    templateId: uuid("template_id").notNull(),
    templateVersion: integer("template_version").notNull(),
    defaults: jsonb("defaults").$type<ConfiguredReport["defaults"]>().notNull(),
    format: text("format").$type<ReportFormat>().notNull(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id),
    reportVersion: integer("report_version").notNull().default(1),
    rowVersion: integer("row_version").notNull().default(1),
    updatedBy: uuid("updated_by")
      .notNull()
      .references(() => users.id),
    updatedAt: timestamp("updated_at", { withTimezone: true })
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
    check(
      "app_reporting_reports_format_check",
      sql`${table.format} IN ('XLSX', 'CSV')`,
    ),
    check(
      "app_reporting_reports_description_check",
      sql`length(${table.description}) <= 2000 AND ${table.description} ~ '[^[:space:]]'`,
    ),
    check(
      "app_reporting_reports_row_version_check",
      sql`${table.rowVersion} > 0`,
    ),
    check(
      "app_reporting_reports_report_version_check",
      sql`${table.reportVersion} > 0`,
    ),
  ],
);

export const reportingReportVersions = pgTable(
  "app_reporting_report_versions",
  {
    reportId: uuid("report_id")
      .notNull()
      .references(() => reportingReports.id),
    version: integer("version").notNull(),
    templateId: uuid("template_id").notNull(),
    templateVersion: integer("template_version").notNull(),
    defaults: jsonb("defaults").$type<ConfiguredReport["defaults"]>().notNull(),
    format: text("format").$type<ReportFormat>().notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.reportId, table.version] }),
    foreignKey({
      columns: [table.templateId, table.templateVersion],
      foreignColumns: [
        reportingTemplateVersions.templateId,
        reportingTemplateVersions.version,
      ],
    }),
    check(
      "app_reporting_report_versions_version_check",
      sql`${table.version} > 0`,
    ),
    check(
      "app_reporting_report_versions_format_check",
      sql`${table.format} IN ('XLSX', 'CSV')`,
    ),
  ],
);

export const reportingAudit = pgTable("app_reporting_audit", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id")
    .notNull()
    .references(() => users.id),
  resourceId: uuid("resource_id").notNull(),
  action: text("action").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  metadata: jsonb("metadata")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),
});
