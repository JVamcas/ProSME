import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  doublePrecision,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import type {
  FormDisplayMode,
  FormPurpose,
  FormFieldType,
  FormStatus,
} from "@/modules/forms/FormTypes";
import { users } from "@/db/schema/identity";
import type { ConditionGroup } from "@/modules/conditions/domain/ConditionGroup";

export const formDefinitions = pgTable(
  "app_form_definitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    purpose: text("purpose").$type<FormPurpose>().notNull().default("OTHER"),
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
    check(
      "app_form_definitions_purpose_check",
      sql`${table.purpose} in ('FUNDING_APPLICATION', 'APPLICATION_REVIEW', 'COI', 'RFI', 'OTHER')`,
    ),
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
    displayMode: text("display_mode")
      .$type<FormDisplayMode>()
      .notNull()
      .default("SINGLE_PAGE"),
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
    check(
      "app_form_versions_display_mode_check",
      sql`${table.displayMode} in ('SINGLE_PAGE', 'STEPS')`,
    ),
    check("app_form_versions_positive_check", sql`${table.versionNumber} > 0`),
    check("app_form_versions_row_version_check", sql`${table.rowVersion} > 0`),
  ],
);

export const formSections = pgTable(
  "app_form_sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    formVersionId: uuid("form_version_id")
      .notNull()
      .references(() => formVersions.id, { onDelete: "restrict" }),
    key: text("key").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    columnSpan: integer("column_span").$type<1 | 2 | 3>().notNull().default(3),
    showContainer: boolean("show_container").notNull().default(true),
    order: integer("display_order").notNull(),
    visibilityCondition: jsonb("visibility_condition")
      .$type<ConditionGroup>(),
  },
  (table) => [
    uniqueIndex("app_form_sections_version_key_unique").on(
      table.formVersionId,
      table.key,
    ),
    uniqueIndex("app_form_sections_version_order_unique").on(
      table.formVersionId,
      table.order,
    ),
    uniqueIndex("app_form_sections_id_version_unique").on(
      table.id,
      table.formVersionId,
    ),
    check("app_form_sections_order_check", sql`${table.order} > 0`),
    check(
      "app_form_sections_column_span_check",
      sql`${table.columnSpan} in (1, 2, 3)`,
    ),
    check(
      "app_form_sections_visibility_condition_check",
      sql`${table.visibilityCondition} is null or (
        jsonb_typeof(${table.visibilityCondition}) = 'object'
        and ${table.visibilityCondition}->>'kind' = 'GROUP'
        and jsonb_typeof(${table.visibilityCondition}->'children') = 'array'
      )`,
    ),
  ],
);

export const formFields = pgTable(
  "app_form_fields",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    formVersionId: uuid("form_version_id")
      .notNull()
      .references(() => formVersions.id, { onDelete: "restrict" }),
    sectionId: uuid("section_id").notNull(),
    columnSpan: integer("column_span").$type<1 | 2 | 3>().notNull().default(1),
    key: text("key").notNull(),
    label: text("label").notNull(),
    type: text("type").$type<FormFieldType>().notNull(),
    required: boolean("required").notNull().default(false),
    helpText: text("help_text"),
    minimum: doublePrecision("minimum"),
    maximum: doublePrecision("maximum"),
    minLength: integer("min_length"),
    maxLength: integer("max_length"),
    order: integer("display_order").notNull(),
    visibilityCondition: jsonb("visibility_condition")
      .$type<ConditionGroup>(),
  },
  (table) => [
    uniqueIndex("app_form_fields_version_key_unique").on(
      table.formVersionId,
      table.key,
    ),
    uniqueIndex("app_form_fields_section_order_unique").on(
      table.sectionId,
      table.order,
    ),
    index("app_form_fields_section_order_idx").on(
      table.sectionId,
      table.order,
    ),
    foreignKey({
      columns: [table.sectionId, table.formVersionId],
      foreignColumns: [formSections.id, formSections.formVersionId],
      name: "app_form_fields_section_version_fk",
    }).onDelete("restrict"),
    check(
      "app_form_fields_type_check",
      sql`${table.type} in ('TEXT', 'TEXTAREA', 'NUMBER', 'CURRENCY', 'PERCENTAGE', 'DATE', 'YES_NO', 'SINGLE_SELECT', 'MULTI_SELECT', 'DOCUMENT')`,
    ),
    check("app_form_fields_order_check", sql`${table.order} > 0`),
    check(
      "app_form_fields_column_span_check",
      sql`${table.columnSpan} in (1, 2, 3)`,
    ),
    check(
      "app_form_fields_visibility_condition_check",
      sql`${table.visibilityCondition} is null or (
        jsonb_typeof(${table.visibilityCondition}) = 'object'
        and ${table.visibilityCondition}->>'kind' = 'GROUP'
        and jsonb_typeof(${table.visibilityCondition}->'children') = 'array'
      )`,
    ),
    check(
      "app_form_fields_number_limits_check",
      sql`(${table.minimum} is null and ${table.maximum} is null) or (${table.type} in ('NUMBER', 'CURRENCY', 'PERCENTAGE') and (${table.minimum} is null or ${table.maximum} is null or ${table.minimum} <= ${table.maximum}) and (${table.type} <> 'PERCENTAGE' or (coalesce(${table.minimum}, 0) >= 0 and coalesce(${table.maximum}, 100) <= 100)))`,
    ),
    check(
      "app_form_fields_length_limits_check",
      sql`(${table.minLength} is null and ${table.maxLength} is null) or (${table.type} in ('TEXT', 'TEXTAREA') and coalesce(${table.minLength}, 0) >= 0 and coalesce(${table.maxLength}, 0) >= 0 and (${table.minLength} is null or ${table.maxLength} is null or ${table.minLength} <= ${table.maxLength}))`,
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
    key: text("key").notNull(),
    label: text("label").notNull(),
    order: integer("display_order").notNull(),
  },
  (table) => [
    uniqueIndex("app_form_field_options_key_unique").on(
      table.fieldId,
      table.key,
    ),
    uniqueIndex("app_form_field_options_order_unique").on(
      table.fieldId,
      table.order,
    ),
    check(
      "app_form_field_options_order_check",
      sql`${table.order} > 0`,
    ),
  ],
);
