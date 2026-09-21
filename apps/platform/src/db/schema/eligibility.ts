import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import type {
  EligibilityAnswer,
  EligibilityOutcome,
  EligibilityRuleSnapshot,
} from "@/modules/eligibility/EligibilityTypes";
import { users } from "./identity";

export const eligibilityAssessments = pgTable("app_eligibility_assessments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  fundingOpportunityId: uuid("funding_opportunity_id").notNull(),
  fundingOpportunityTitle: text("funding_opportunity_title").notNull(),
  ruleSetVersion: text("rule_set_version").notNull(),
  ruleSnapshot: jsonb("rule_snapshot")
    .$type<EligibilityRuleSnapshot[]>()
    .notNull(),
  answers: jsonb("answers")
    .$type<Record<string, EligibilityAnswer>>()
    .notNull(),
  outcome: text("outcome").$type<EligibilityOutcome>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  index("app_eligibility_assessments_owner_created_idx").on(
    table.userId,
    table.createdAt,
  ),
  index("app_eligibility_assessments_opportunity_idx").on(
    table.fundingOpportunityId,
  ),
]);
