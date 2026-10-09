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
import type {
  FundingCallGovernanceOutcome,
  SerializedFundingCallGovernanceSnapshot,
} from "../domain/FundingCallGovernance";
import { fundingCalls } from "./funding-call.schema";

export const fundingCallGovernancePolicy = pgTable(
  "app_funding_call_governance_policy",
  {
    id: integer("id").primaryKey().default(1),
    allowSubmitterWithdrawal: boolean("allow_submitter_withdrawal")
      .notNull()
      .default(true),
    enforceMakerChecker: boolean("enforce_maker_checker")
      .notNull()
      .default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedBy: uuid("updated_by").references(() => users.id, {
      onDelete: "restrict",
    }),
  },
  (table) => [
    check(
      "app_funding_call_governance_policy_singleton_check",
      sql`${table.id} = 1`,
    ),
  ],
);
export const fundingCallGovernanceReviews = pgTable(
  "app_funding_call_governance_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fundingCallId: uuid("funding_call_id")
      .notNull()
      .references(() => fundingCalls.id, { onDelete: "restrict" }),
    fundingCallVersionId: uuid("funding_call_version_id"),
    outcome: text("outcome")
      .$type<FundingCallGovernanceOutcome>()
      .notNull()
      .default("PENDING"),
    submittedBy: uuid("submitted_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull(),
    submittedRowVersion: integer("submitted_row_version").notNull(),
    creatorId: uuid("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    materialEditorId: uuid("material_editor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    configurationSnapshot: jsonb("configuration_snapshot")
      .$type<SerializedFundingCallGovernanceSnapshot>()
      .notNull(),
    decidedBy: uuid("decided_by").references(() => users.id, {
      onDelete: "restrict",
    }),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decisionRowVersion: integer("decision_row_version"),
    reason: text("reason"),
  },
  (table) => [
    index("app_funding_call_governance_review_call_time_idx").on(
      table.fundingCallId,
      table.submittedAt,
      table.id,
    ),
    uniqueIndex("app_funding_call_governance_review_pending_unique")
      .on(table.fundingCallId)
      .where(sql`${table.outcome} = 'PENDING'`),
    check(
      "app_funding_call_governance_review_outcome_check",
      sql`${table.outcome} in ('PENDING', 'APPROVED', 'RETURNED', 'WITHDRAWN')`,
    ),
    check(
      "app_funding_call_governance_review_submission_version_check",
      sql`${table.submittedRowVersion} > 0`,
    ),
    check(
      "app_funding_call_governance_review_decision_check",
      sql`(${table.outcome} = 'PENDING'
          and ${table.decidedBy} is null
          and ${table.decidedAt} is null
          and ${table.decisionRowVersion} is null
          and ${table.reason} is null)
        or (${table.outcome} <> 'PENDING'
          and ${table.decidedBy} is not null
          and ${table.decidedAt} is not null
          and ${table.decisionRowVersion} > ${table.submittedRowVersion})`,
    ),
    check(
      "app_funding_call_governance_review_reason_check",
      sql`(${table.outcome} = 'RETURNED' and length(trim(${table.reason})) > 0)
        or (${table.outcome} <> 'RETURNED' and ${table.reason} is null)`,
    ),
  ],
);
