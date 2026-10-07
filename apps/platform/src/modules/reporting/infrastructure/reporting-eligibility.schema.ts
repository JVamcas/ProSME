import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { fundingCalls } from "@/modules/funding-calls/infrastructure/funding-call.schema";
import { eligibilityRuleSetVersions } from "@/modules/eligibility/infrastructure/eligibility-ruleset.schema";

export const anonymousEligibilityChecks = pgTable(
  "app_reporting_anonymous_eligibility_checks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fundingCallId: uuid("funding_call_id")
      .notNull()
      .references(() => fundingCalls.id),
    fundingCallVersion: integer("funding_call_version").notNull(),
    ruleSetVersionId: uuid("rule_set_version_id")
      .notNull()
      .references(() => eligibilityRuleSetVersions.id),
    outcome: text("outcome").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("app_reporting_eligibility_period_idx").on(table.occurredAt),
    index("app_reporting_eligibility_call_period_idx").on(
      table.fundingCallId,
      table.occurredAt,
    ),
    check(
      "app_reporting_eligibility_outcome_check",
      sql`${table.outcome} IN ('likely-eligible', 'not-currently-eligible', 'review-required')`,
    ),
    check(
      "app_reporting_eligibility_version_check",
      sql`${table.fundingCallVersion} > 0`,
    ),
  ],
);
