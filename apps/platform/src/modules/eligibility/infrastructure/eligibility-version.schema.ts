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
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { users } from "@/db/schema/identity";
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
    sourceVersionId: uuid("source_version_id").references(
      (): AnyPgColumn => eligibilityRuleSetVersions.id,
      { onDelete: "restrict" },
    ),
    metadata: jsonb("metadata")
      .$type<Partial<{ code: string; name: string; description: string }>>()
      .notNull()
      .default({}),
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
    uniqueIndex("app_eligibility_rule_set_versions_source_draft_unique")
      .on(table.ruleSetId, table.sourceVersionId)
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
