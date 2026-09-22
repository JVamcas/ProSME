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

import { applications } from "@/db/schema/applications";
import { users } from "@/db/schema/identity";
import type {
  EligibilityContextReference,
  FinalScreeningOutcome,
} from "../domain/AuthoritativeEligibilityOutcome";
import type {
  EligibilityFinding,
  EligibilityRuleOutcome,
} from "../domain/EligibilityEvaluation";
import type { JsonValue } from "@/modules/conditions/domain/Operand";
import type { EligibilityValueProvenance } from "../domain/EligibilityDataResolution";
import { eligibilityRuleSetVersions } from "./eligibility-ruleset.schema";

export const authoritativeEligibilityOutcomes = pgTable(
  "app_authoritative_eligibility_outcomes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    ruleSetVersionId: uuid("eligibility_rule_set_version_id")
      .notNull()
      .references(() => eligibilityRuleSetVersions.id, {
        onDelete: "restrict",
      }),
    ruleSetVersionNumber: integer("rule_set_version_number").notNull(),
    evaluatedAt: timestamp("evaluated_at", { withTimezone: true })
      .notNull(),
    evaluatedBy: uuid("evaluated_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    contextReference: jsonb("context_reference")
      .$type<EligibilityContextReference>()
      .notNull(),
    evaluatedValues: jsonb("evaluated_values")
      .$type<Record<string, JsonValue>>()
      .notNull(),
    evaluatedValueProvenance: jsonb("evaluated_value_provenance")
      .$type<Record<string, EligibilityValueProvenance>>()
      .notNull(),
    hardFailures: jsonb("hard_failures")
      .$type<EligibilityFinding[]>()
      .notNull(),
    softFailures: jsonb("soft_failures")
      .$type<EligibilityFinding[]>()
      .notNull(),
    warnings: jsonb("warnings")
      .$type<EligibilityFinding[]>()
      .notNull(),
    ruleOutcomes: jsonb("rule_outcomes")
      .$type<EligibilityRuleOutcome[]>()
      .notNull(),
    eligible: boolean("eligible").notNull(),
    manualScreeningRequired: boolean("manual_screening_required").notNull(),
    finalOutcome: text("final_screening_outcome")
      .$type<FinalScreeningOutcome>(),
  },
  (table) => [
    uniqueIndex("app_authoritative_eligibility_outcomes_application_unique")
      .on(table.applicationId),
    index("app_authoritative_eligibility_outcomes_version_idx").on(
      table.ruleSetVersionId,
    ),
    check(
      "app_authoritative_eligibility_outcomes_version_number_check",
      sql`${table.ruleSetVersionNumber} > 0`,
    ),
    check(
      "app_authoritative_eligibility_outcomes_final_outcome_check",
      sql`${table.finalOutcome} is null or ${table.finalOutcome} in ('ELIGIBLE', 'INELIGIBLE')`,
    ),
    check(
      "app_authoritative_eligibility_outcomes_result_check",
      sql`(${table.finalOutcome} = 'INELIGIBLE' and ${table.eligible} = false)
        or (${table.finalOutcome} = 'ELIGIBLE' and ${table.eligible} = true and ${table.manualScreeningRequired} = false)
        or (${table.finalOutcome} is null and ${table.eligible} = true and ${table.manualScreeningRequired} = true)`,
    ),
  ],
);
