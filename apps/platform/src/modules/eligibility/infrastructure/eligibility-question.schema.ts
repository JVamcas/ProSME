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
import { formVersions } from "@/modules/forms/infrastructure/form.schema";
import type { EligibilityQuestionInputType } from "../domain/EligibilityQuestion";
import { eligibilityRuleSetVersions } from "./eligibility-ruleset.schema";

export const eligibilityQuestions = pgTable(
  "app_eligibility_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    inputType: text("input_type").$type<EligibilityQuestionInputType>().notNull(),
    applicantLabel: text("applicant_label").notNull(),
    reviewerLabel: text("reviewer_label").notNull(),
    active: boolean("active").notNull().default(true),
    rowVersion: integer("row_version").notNull().default(1),
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
    uniqueIndex("app_eligibility_questions_code_unique").on(table.code),
    check(
      "app_eligibility_questions_code_check",
      sql`${table.code} ~ '^[A-Z][A-Z0-9_]*$'`,
    ),
    check(
      "app_eligibility_questions_type_check",
      sql`${table.inputType} in (
        'BOOLEAN', 'YES_NO_NA', 'TEXT', 'NUMBER', 'PERCENTAGE', 'DATE'
      )`,
    ),
    check(
      "app_eligibility_questions_labels_check",
      sql`length(btrim(${table.applicantLabel})) > 0
        and length(btrim(${table.reviewerLabel})) > 0`,
    ),
    check(
      "app_eligibility_questions_row_version_check",
      sql`${table.rowVersion} > 0`,
    ),
  ],
);

export const eligibilityRuleSetQuestionBindings = pgTable(
  "app_eligibility_rule_set_question_bindings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    versionId: uuid("version_id")
      .notNull()
      .references(() => eligibilityRuleSetVersions.id, {
        onDelete: "restrict",
      }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => eligibilityQuestions.id, { onDelete: "restrict" }),
    code: text("code_snapshot").notNull(),
    inputType: text("input_type_snapshot")
      .$type<EligibilityQuestionInputType>()
      .notNull(),
    applicantLabel: text("applicant_label_snapshot").notNull(),
    reviewerLabel: text("reviewer_label_snapshot").notNull(),
    order: integer("display_order").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("app_eligibility_question_bindings_version_question_unique")
      .on(table.versionId, table.questionId),
    uniqueIndex("app_eligibility_question_bindings_version_code_unique")
      .on(table.versionId, table.code),
    uniqueIndex("app_eligibility_question_bindings_version_order_unique")
      .on(table.versionId, table.order),
    index("app_eligibility_question_bindings_question_idx")
      .on(table.questionId),
    check(
      "app_eligibility_question_bindings_order_check",
      sql`${table.order} > 0`,
    ),
  ],
);

export const eligibilityRuleSetVerificationForms = pgTable(
  "app_eligibility_rule_set_verification_forms",
  {
    versionId: uuid("version_id")
      .primaryKey()
      .references(() => eligibilityRuleSetVersions.id, {
        onDelete: "restrict",
      }),
    formVersionId: uuid("form_version_id")
      .notNull()
      .references(() => formVersions.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("app_eligibility_verification_forms_form_version_unique")
      .on(table.formVersionId),
  ],
);
