import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import type {
  FormDataType,
  FormInputType,
  FormStatus,
} from "@/modules/forms/FormTypes";
import { users } from "./identity";

export const formDefinitions = pgTable(
  "app_form_definitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    active: boolean("active").notNull().default(true),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("app_form_definitions_code_unique").on(table.code),
  ],
);

export const formVersions = pgTable(
  "app_form_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    formDefinitionId: uuid("form_definition_id")
      .notNull()
      .references(() => formDefinitions.id, { onDelete: "restrict" }),
    versionNumber: integer("version_number").notNull(),
    status: text("status").$type<FormStatus>().notNull().default("DRAFT"),
    instructions: text("instructions"),
    submitLabel: text("submit_label").notNull().default("Submit"),
    rowVersion: integer("row_version").notNull().default(1),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    publishedBy: uuid("published_by").references(() => users.id, {
      onDelete: "restrict",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("app_form_versions_definition_number_unique").on(
      table.formDefinitionId,
      table.versionNumber,
    ),
    index("app_form_versions_definition_status_idx").on(
      table.formDefinitionId,
      table.status,
    ),
    uniqueIndex("app_form_versions_one_draft_unique")
      .on(table.formDefinitionId)
      .where(sql`${table.status} = 'DRAFT'`),
    check(
      "app_form_versions_status_check",
      sql`${table.status} in ('DRAFT', 'PUBLISHED', 'RETIRED')`,
    ),
    check("app_form_versions_positive_check", sql`${table.versionNumber} > 0`),
    check("app_form_versions_row_version_check", sql`${table.rowVersion} > 0`),
  ],
);

export const formFields = pgTable(
  "app_form_fields",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    formVersionId: uuid("form_version_id")
      .notNull()
      .references(() => formVersions.id, { onDelete: "restrict" }),
    code: text("code").notNull(),
    label: text("label").notNull(),
    inputType: text("input_type").$type<FormInputType>().notNull(),
    dataType: text("data_type").$type<FormDataType>().notNull(),
    rowIndex: integer("row_index").notNull(),
    columnIndex: integer("column_index").notNull(),
    columnSpan: integer("column_span").notNull().default(1),
    required: boolean("required").notNull().default(false),
    placeholder: text("placeholder"),
    helpText: text("help_text"),
    validation: jsonb("validation").$type<Record<string, unknown> | null>(),
  },
  (table) => [
    uniqueIndex("app_form_fields_version_code_unique").on(
      table.formVersionId,
      table.code,
    ),
    uniqueIndex("app_form_fields_version_position_unique").on(
      table.formVersionId,
      table.rowIndex,
      table.columnIndex,
    ),
    index("app_form_fields_version_order_idx").on(
      table.formVersionId,
      table.rowIndex,
      table.columnIndex,
    ),
    check("app_form_fields_row_positive_check", sql`${table.rowIndex} > 0`),
    check(
      "app_form_fields_column_check",
      sql`${table.columnIndex} in (1, 2)`,
    ),
    check(
      "app_form_fields_span_check",
      sql`${table.columnSpan} in (1, 2)`,
    ),
    check(
      "app_form_fields_span_start_check",
      sql`${table.columnSpan} <> 2 or ${table.columnIndex} = 1`,
    ),
  ],
);

export const formFieldOptions = pgTable(
  "app_form_field_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fieldId: uuid("field_id")
      .notNull()
      .references(() => formFields.id, { onDelete: "restrict" }),
    code: text("code").notNull(),
    label: text("label").notNull(),
    position: integer("position").notNull(),
  },
  (table) => [
    uniqueIndex("app_form_field_options_code_unique").on(
      table.fieldId,
      table.code,
    ),
    uniqueIndex("app_form_field_options_position_unique").on(
      table.fieldId,
      table.position,
    ),
    check(
      "app_form_field_options_position_check",
      sql`${table.position} > 0`,
    ),
  ],
);
