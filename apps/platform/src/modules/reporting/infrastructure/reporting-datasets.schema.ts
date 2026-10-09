import { sql } from "drizzle-orm";
import {
  check,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
} from "drizzle-orm/pg-core";
import type { ReportDataset } from "../domain/ReportDataset";

export const reportingDatasets = pgTable(
  "app_reporting_datasets",
  {
    key: text("key").$type<ReportDataset["key"]>().notNull(),
    version: integer("version").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    definition: jsonb("definition")
      .$type<ReportDataset["definition"]>()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.key, table.version] }),
    check(
      "app_reporting_datasets_description_check",
      sql`length(${table.description}) <= 2000 AND ${table.description} ~ '[^[:space:]]'`,
    ),
    check("app_reporting_datasets_version_check", sql`${table.version} > 0`),
  ],
);
