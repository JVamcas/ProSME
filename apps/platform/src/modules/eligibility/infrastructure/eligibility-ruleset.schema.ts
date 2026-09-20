import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
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
