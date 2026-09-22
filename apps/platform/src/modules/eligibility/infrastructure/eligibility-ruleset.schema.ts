import { sql } from "drizzle-orm";
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

import { users } from "@/db/schema/identity";
import { conditionGroups } from "@/modules/conditions/infrastructure/condition.schema";
import type {
  EligibilityExecutionMode,
  EligibilityFailureType,
} from "../domain/EligibilityRule";
import type {
  EligibilityInputMode,
  EligibilityScreeningSourceKind,
  SelfCheckQuestionOption,
  SelfCheckAnswerType,
} from "../domain/EligibilityInputDefinition";
import type { EligibilityRuleSetStatus } from "../domain/EligibilityRuleSet";

export const eligibilityRuleSets = pgTable(
  "app_eligibility_rule_sets",
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
    uniqueIndex("app_eligibility_rule_sets_code_unique").on(table.code),
  ],
);

export const eligibilityRuleSetVersions = pgTable(
  "app_eligibility_rule_set_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ruleSetId: uuid("rule_set_id")
      .notNull()
      .references(() => eligibilityRuleSets.id, { onDelete: "restrict" }),
    versionNumber: integer("version_number").notNull(),
    status: text("status")
      .$type<EligibilityRuleSetStatus>()
      .notNull()
      .default("DRAFT"),
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
    uniqueIndex("app_eligibility_rule_set_versions_number_unique").on(
      table.ruleSetId,
      table.versionNumber,
    ),
    uniqueIndex("app_eligibility_rule_set_versions_one_draft_unique")
      .on(table.ruleSetId)
      .where(sql`${table.status} = 'DRAFT'`),
    index("app_eligibility_rule_set_versions_status_idx").on(
      table.ruleSetId,
      table.status,
    ),
    check(
      "app_eligibility_rule_set_versions_status_check",
      sql`${table.status} in ('DRAFT', 'PUBLISHED', 'RETIRED')`,
    ),
    check(
      "app_eligibility_rule_set_versions_number_check",
      sql`${table.versionNumber} > 0`,
    ),
    check(
      "app_eligibility_rule_set_versions_row_version_check",
      sql`${table.rowVersion} > 0`,
    ),
  ],
);

export const eligibilityRules = pgTable(
  "app_eligibility_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    versionId: uuid("version_id")
      .notNull()
      .references(() => eligibilityRuleSetVersions.id, {
        onDelete: "restrict",
      }),
    conditionGroupId: uuid("condition_group_id")
      .notNull()
      .references(() => conditionGroups.id, { onDelete: "restrict" }),
    conditionKind: text("condition_kind")
      .$type<"CONDITION" | "GROUP">()
      .notNull(),
    conditionId: uuid("condition_id"),
    failureType: text("failure_type")
      .$type<EligibilityFailureType>()
      .notNull(),
    reasonCode: text("reason_code").notNull(),
    applicantMessage: text("applicant_message").notNull(),
    executionMode: text("execution_mode")
      .$type<EligibilityExecutionMode>()
      .notNull(),
    order: integer("display_order").notNull(),
  },
  (table) => [
    uniqueIndex("app_eligibility_rules_version_reason_unique").on(
      table.versionId,
      table.reasonCode,
    ),
    uniqueIndex("app_eligibility_rules_version_order_unique").on(
      table.versionId,
      table.order,
    ),
    index("app_eligibility_rules_condition_group_idx").on(
      table.conditionGroupId,
    ),
    check(
      "app_eligibility_rules_condition_reference_check",
      sql`(${table.conditionKind} = 'GROUP' and ${table.conditionId} is null)
        or (${table.conditionKind} = 'CONDITION' and ${table.conditionId} is not null)`,
    ),
    check(
      "app_eligibility_rules_failure_type_check",
      sql`${table.failureType} in ('HARD_FAIL', 'SOFT_FAIL', 'WARNING')`,
    ),
    check(
      "app_eligibility_rules_execution_mode_check",
      sql`${table.executionMode} in ('SELF_CHECK', 'SCREENING', 'BOTH')`,
    ),
    check(
      "app_eligibility_rules_reason_code_check",
      sql`${table.reasonCode} ~ '^[A-Z][A-Z0-9_]*$'`,
    ),
    check(
      "app_eligibility_rules_message_check",
      sql`length(btrim(${table.applicantMessage})) > 0`,
    ),
    check("app_eligibility_rules_order_check", sql`${table.order} > 0`),
  ],
);

export const eligibilityInputDefinitions = pgTable(
  "app_eligibility_input_definitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    versionId: uuid("version_id")
      .notNull()
      .references(() => eligibilityRuleSetVersions.id, {
        onDelete: "restrict",
      }),
    stableKey: text("stable_key").notNull(),
    label: text("label").notNull(),
    type: text("data_type").$type<"TEXT" | "NUMBER" | "BOOLEAN" | "DATE">()
      .notNull(),
    availableIn: text("available_in").array().$type<EligibilityInputMode[]>()
      .notNull(),
    order: integer("display_order").notNull(),
    groupKey: text("group_key"),
    groupLabel: text("group_label"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    updatedBy: uuid("updated_by")
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
    uniqueIndex("app_eligibility_inputs_version_key_unique").on(
      table.versionId,
      table.stableKey,
    ),
    uniqueIndex("app_eligibility_inputs_version_order_unique").on(
      table.versionId,
      table.order,
    ),
    index("app_eligibility_inputs_version_idx").on(table.versionId),
    check(
      "app_eligibility_inputs_key_check",
      sql`${table.stableKey} ~ '^[a-z][a-z0-9_]*$'`,
    ),
    check(
      "app_eligibility_inputs_label_check",
      sql`length(btrim(${table.label})) > 0`,
    ),
    check(
      "app_eligibility_inputs_type_check",
      sql`${table.type} in ('TEXT', 'NUMBER', 'BOOLEAN', 'DATE')`,
    ),
    check(
      "app_eligibility_inputs_modes_check",
      sql`cardinality(${table.availableIn}) between 1 and 2
        and ${table.availableIn} <@ array['SELF_CHECK', 'SCREENING']::text[]
        and (
          cardinality(${table.availableIn}) = 1
          or ${table.availableIn}[1] <> ${table.availableIn}[2]
        )`,
    ),
    check("app_eligibility_inputs_order_check", sql`${table.order} > 0`),
    check(
      "app_eligibility_inputs_group_check",
      sql`(${table.groupKey} is null) = (${table.groupLabel} is null)`,
    ),
  ],
);

export const eligibilitySelfCheckQuestions = pgTable(
  "app_eligibility_self_check_questions",
  {
    inputDefinitionId: uuid("input_definition_id")
      .primaryKey()
      .references(() => eligibilityInputDefinitions.id, {
        onDelete: "restrict",
      }),
    prompt: text("prompt").notNull(),
    helpText: text("help_text").notNull().default(""),
    explanation: text("explanation").notNull().default(""),
    answerType: text("answer_type").$type<SelfCheckAnswerType>().notNull(),
    required: boolean("required").notNull().default(true),
    options: jsonb("options").$type<SelfCheckQuestionOption[]>()
      .notNull()
      .default([]),
  },
  (table) => [
    check(
      "app_eligibility_questions_prompt_check",
      sql`length(btrim(${table.prompt})) > 0`,
    ),
    check(
      "app_eligibility_questions_answer_type_check",
      sql`${table.answerType} in (
        'BOOLEAN', 'YES_NO_NA', 'TEXT', 'NUMBER', 'DATE',
        'SINGLE_SELECT', 'MULTI_SELECT'
      )`,
    ),
    check(
      "app_eligibility_questions_options_check",
      sql`jsonb_typeof(${table.options}) = 'array'`,
    ),
  ],
);

export const eligibilityScreeningSourceBindings = pgTable(
  "app_eligibility_screening_source_bindings",
  {
    inputDefinitionId: uuid("input_definition_id")
      .primaryKey()
      .references(() => eligibilityInputDefinitions.id, {
        onDelete: "restrict",
      }),
    sourceKind: text("source_kind")
      .$type<EligibilityScreeningSourceKind>()
      .notNull(),
    sourceDefinitionId: uuid("source_definition_id").notNull(),
    sourceVersionId: uuid("source_version_id"),
    sourceKey: text("source_key").notNull(),
    valuePath: text("value_path").notNull(),
  },
  (table) => [
    index("app_eligibility_screening_source_definition_idx").on(
      table.sourceKind,
      table.sourceDefinitionId,
      table.sourceVersionId,
    ),
    check(
      "app_eligibility_screening_source_kind_check",
      sql`${table.sourceKind} in (
        'APPLICATION_FORM_FIELD', 'FUNDING_CALL_FIELD',
        'WORKFLOW_FORM_FIELD', 'SCREENING_CHECKLIST_ITEM',
        'DOCUMENT_REQUIREMENT_FACT', 'MANUAL_ASSESSMENT',
        'INTEGRATION_OUTPUT'
      )`,
    ),
    check(
      "app_eligibility_screening_source_key_check",
      sql`length(btrim(${table.sourceKey})) > 0
        and length(btrim(${table.valuePath})) > 0`,
    ),
    check(
      "app_eligibility_screening_source_version_check",
      sql`(${table.sourceKind} = 'FUNDING_CALL_FIELD'
          and ${table.sourceVersionId} is null)
        or (${table.sourceKind} <> 'FUNDING_CALL_FIELD'
          and ${table.sourceVersionId} is not null)`,
    ),
  ],
);
