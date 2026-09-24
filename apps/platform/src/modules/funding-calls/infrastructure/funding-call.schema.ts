import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "@/db/schema/identity";
import { formVersions } from "@/modules/forms/infrastructure/form.schema";
import { eligibilityRuleSetVersions } from "@/modules/eligibility/infrastructure/eligibility-ruleset.schema";
import { workflowDefinitionVersions } from "@/modules/workflows/infrastructure/workflow.schema";
import type { ApplicationDuplicatePolicy } from "@/modules/applications/domain/Application";
import type { FundingCallStatus } from "../domain/FundingCall";
import type {
  FundingCallGovernanceOutcome,
  SerializedFundingCallGovernanceSnapshot,
} from "../domain/FundingCallGovernance";
import type { FundingCallLifecycleCommand } from "../domain/FundingCallLifecycle";
import type { FundingCallPublicationSnapshot } from "../domain/FundingCallPublication";

export const fundingCalls = pgTable(
  "app_funding_calls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reference: text("reference").notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    eligibilitySummary: text("eligibility_summary"),
    eligibilityRuleSetVersionId: uuid("eligibility_rule_set_version_id")
      .references(() => eligibilityRuleSetVersions.id, {
        onDelete: "restrict",
      }),
    formVersionId: uuid("form_version_id").references(() => formVersions.id, {
      onDelete: "restrict",
    }),
    workflowTemplateVersionId: uuid("workflow_template_version_id").references(
      () => workflowDefinitionVersions.id,
      { onDelete: "restrict" },
    ),
    applicationDuplicatePolicy: text("application_duplicate_policy")
      .$type<ApplicationDuplicatePolicy>()
      .notNull()
      .default("one_per_business"),
    fundingInstrument: text("funding_instrument"),
    thematicArea: text("thematic_area"),
    totalBudgetEnvelope: numeric("total_budget_envelope", {
      precision: 18,
      scale: 2,
    }).notNull(),
    minimumGrantAmount: numeric("minimum_grant_amount", {
      precision: 18,
      scale: 2,
    }).notNull(),
    maximumGrantAmount: numeric("maximum_grant_amount", {
      precision: 18,
      scale: 2,
    }).notNull(),
    opensAt: timestamp("opens_at", { withTimezone: true }).notNull(),
    closesAt: timestamp("closes_at", { withTimezone: true }).notNull(),
    status: text("status").$type<FundingCallStatus>().notNull().default("DRAFT"),
    suspendedFromStatus: text("suspended_from_status").$type<
      "SCHEDULED" | "LIVE"
    >(),
    publicContactName: text("public_contact_name"),
    publicContactEmail: text("public_contact_email"),
    publicContactPhone: text("public_contact_phone"),
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
    uniqueIndex("app_funding_calls_reference_unique").on(table.reference),
    uniqueIndex("app_funding_calls_slug_unique").on(table.slug),
    index("app_funding_calls_status_dates_idx").on(
      table.status,
      table.opensAt,
      table.closesAt,
    ),
    index("app_funding_calls_form_version_idx").on(table.formVersionId),
    index("app_funding_calls_workflow_template_version_idx").on(
      table.workflowTemplateVersionId,
    ),
    index("app_funding_calls_eligibility_version_idx").on(
      table.eligibilityRuleSetVersionId,
    ),
    check(
      "app_funding_calls_application_duplicate_policy_check",
      sql`${table.applicationDuplicatePolicy} in ('one_per_applicant', 'one_per_business', 'none')`,
    ),
    check(
      "app_funding_calls_status_check",
      sql`${table.status} in (
        'DRAFT',
        'APPROVAL_PENDING',
        'APPROVED',
        'SCHEDULED',
        'LIVE',
        'SUSPENDED',
        'CLOSED',
        'WITHDRAWN',
        'ARCHIVED'
      )`,
    ),
    check(
      "app_funding_calls_suspended_from_status_check",
      sql`(${table.status} = 'SUSPENDED'
          and ${table.suspendedFromStatus} in ('SCHEDULED', 'LIVE'))
        or (${table.status} <> 'SUSPENDED'
          and ${table.suspendedFromStatus} is null)`,
    ),
    check(
      "app_funding_calls_budget_check",
      sql`${table.totalBudgetEnvelope} >= 0
        and ${table.minimumGrantAmount} >= 0
        and ${table.maximumGrantAmount} >= ${table.minimumGrantAmount}
        and ${table.totalBudgetEnvelope} >= ${table.maximumGrantAmount}`,
    ),
    check(
      "app_funding_calls_dates_check",
      sql`${table.closesAt} > ${table.opensAt}`,
    ),
    check(
      "app_funding_calls_row_version_check",
      sql`${table.rowVersion} > 0`,
    ),
  ],
);
export const fundingCallLifecycleHistory = pgTable(
  "app_funding_call_lifecycle_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fundingCallId: uuid("funding_call_id")
      .notNull()
      .references(() => fundingCalls.id, { onDelete: "restrict" }),
    command: text("command").$type<FundingCallLifecycleCommand>().notNull(),
    sourceStatus: text("source_status").$type<FundingCallStatus>().notNull(),
    targetStatus: text("target_status").$type<FundingCallStatus>().notNull(),
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "restrict",
    }),
    systemActor: text("system_actor"),
    reason: text("reason"),
    commandTime: timestamp("command_time", { withTimezone: true }).notNull(),
    effectiveTime: timestamp("effective_time", { withTimezone: true }).notNull(),
    rowVersion: integer("row_version").notNull(),
    correlationId: text("correlation_id").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
  },
  (table) => [
    index("app_funding_call_lifecycle_call_time_idx").on(
      table.fundingCallId,
      table.commandTime,
      table.id,
    ),
    uniqueIndex("app_funding_call_lifecycle_idempotency_unique").on(
      table.idempotencyKey,
    ),
    check(
      "app_funding_call_lifecycle_command_check",
      sql`${table.command} in (
        'SUBMIT_FOR_APPROVAL',
        'RETURN_FOR_AMENDMENT',
        'APPROVE',
        'PUBLISH',
        'OPEN',
        'SUSPEND',
        'RESUME',
        'CLOSE',
        'WITHDRAW',
        'ARCHIVE'
      )`,
    ),
    check(
      "app_funding_call_lifecycle_source_status_check",
      sql`${table.sourceStatus} in (
        'DRAFT',
        'APPROVAL_PENDING',
        'APPROVED',
        'SCHEDULED',
        'LIVE',
        'SUSPENDED',
        'CLOSED',
        'WITHDRAWN',
        'ARCHIVED'
      )`,
    ),
    check(
      "app_funding_call_lifecycle_target_status_check",
      sql`${table.targetStatus} in (
        'DRAFT',
        'APPROVAL_PENDING',
        'APPROVED',
        'SCHEDULED',
        'LIVE',
        'SUSPENDED',
        'CLOSED',
        'WITHDRAWN',
        'ARCHIVED'
      )`,
    ),
    check(
      "app_funding_call_lifecycle_actor_check",
      sql`(${table.actorId} is not null and ${table.systemActor} is null)
        or (${table.actorId} is null and length(trim(${table.systemActor})) > 0)`,
    ),
    check(
      "app_funding_call_lifecycle_row_version_check",
      sql`${table.rowVersion} > 1`,
    ),
  ],
);
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
    check("app_funding_call_governance_policy_singleton_check", sql`${table.id} = 1`),
  ],
);
export const fundingCallPublicationRevisions = pgTable(
  "app_funding_call_publication_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fundingCallId: uuid("funding_call_id")
      .notNull()
      .references(() => fundingCalls.id, { onDelete: "restrict" }),
    revisionNumber: integer("revision_number").notNull(),
    sourceRowVersion: integer("source_row_version").notNull(),
    publishedStatus: text("published_status")
      .$type<"SCHEDULED" | "LIVE">()
      .notNull(),
    snapshot: jsonb("snapshot")
      .$type<FundingCallPublicationSnapshot>()
      .notNull(),
    lifecycleHistoryId: uuid("lifecycle_history_id")
      .notNull()
      .references(() => fundingCallLifecycleHistory.id, {
        onDelete: "restrict",
      }),
    publishedBy: uuid("published_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    correlationId: uuid("correlation_id").notNull(),
  },
  (table) => [
    uniqueIndex("app_funding_call_publication_revision_unique").on(
      table.fundingCallId,
      table.revisionNumber,
    ),
    uniqueIndex("app_funding_call_publication_lifecycle_unique").on(
      table.lifecycleHistoryId,
    ),
    check(
      "app_funding_call_publication_revision_number_check",
      sql`${table.revisionNumber} > 0`,
    ),
    check(
      "app_funding_call_publication_source_version_check",
      sql`${table.sourceRowVersion} > 0`,
    ),
    check(
      "app_funding_call_publication_status_check",
      sql`${table.publishedStatus} in ('SCHEDULED', 'LIVE')`,
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
export const fundingCallPublicDocuments = pgTable(
  "app_funding_call_public_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fundingCallId: uuid("funding_call_id")
      .notNull()
      .references(() => fundingCalls.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    url: text("url").notNull(),
    displayOrder: integer("display_order").notNull().default(0),
    finalized: boolean("finalized").notNull().default(false),
    markedForPublication: boolean("marked_for_publication")
      .notNull()
      .default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    securityCleared: boolean("security_cleared").notNull().default(false),
  },
  (table) => [
    index("app_funding_call_public_documents_call_idx").on(
      table.fundingCallId,
      table.displayOrder,
    ),
    check(
      "app_funding_call_public_documents_display_order_check",
      sql`${table.displayOrder} >= 0`,
    ),
    check(
      "app_funding_call_public_documents_url_check",
      sql`${table.url} ~ '^(https?://|/)'`,
    ),
  ],
);
