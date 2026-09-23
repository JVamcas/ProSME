import { sql } from "drizzle-orm";
import {
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

import type {
  ApplicationBusinessSection,
  ApplicationFinancialSection,
  ApplicationProjectSection,
  ApplicationSectionCompletion,
} from "@/modules/applications/ApplicationSchemas";
import type { ApplicationDeclarationsSection } from "@/modules/applications/ApplicationDeclarationSchemas";
import type {
  ApplicationDuplicatePolicy,
  ApplicationLifecycleStatus,
} from "@/modules/applications/domain/Application";
import { users } from "@/db/schema/identity";
import { businessProfiles } from "@/db/schema/profiles";
import { fundingCalls } from "@/modules/funding-calls/infrastructure/funding-call.schema";
import { formVersions } from "@/modules/forms/infrastructure/form.schema";
import { eligibilityRuleSetVersions } from "@/modules/eligibility/infrastructure/eligibility-ruleset.schema";

export const applications = pgTable("app_applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerUserId: uuid("owner_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  fundingOpportunityId: uuid("funding_opportunity_id")
    .notNull()
    .references(() => fundingCalls.id, { onDelete: "restrict" }),
  fundingOpportunityTitle: text("funding_opportunity_title").notNull(),
  eligibilityRuleSetVersionId: uuid("eligibility_rule_set_version_id")
    .references(() => eligibilityRuleSetVersions.id, {
      onDelete: "restrict",
    }),
  formVersionId: uuid("form_version_id").references(() => formVersions.id, {
    onDelete: "restrict",
  }),
  businessId: uuid("business_id").references(() => businessProfiles.id, {
    onDelete: "restrict",
  }),
  status: text("status")
    .$type<ApplicationLifecycleStatus>()
    .notNull()
    .default("draft"),
  duplicatePolicy: text("duplicate_policy")
    .$type<ApplicationDuplicatePolicy>()
    .notNull()
    .default("one_per_business"),
  reference: text("reference"),
  latestDraftResponseId: uuid("latest_draft_response_id"),
  submissionSnapshotId: uuid("submission_snapshot_id"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
  currentSection: text("current_section")
    .$type<
      "business" | "project" | "financial" | "documents" | "declarations"
    >()
    .notNull()
    .default("business"),
  businessSection: jsonb("business_section")
    .$type<Partial<ApplicationBusinessSection>>()
    .notNull()
    .default({}),
  projectSection: jsonb("project_section")
    .$type<Partial<ApplicationProjectSection>>()
    .notNull()
    .default({}),
  financialSection: jsonb("financial_section")
    .$type<Partial<ApplicationFinancialSection>>()
    .notNull()
    .default({}),
  declarationsSection: jsonb("declarations_section")
    .$type<Partial<ApplicationDeclarationsSection>>()
    .notNull()
    .default({}),
  declarationAcceptance: jsonb("declaration_acceptance").$type<{
    acceptedAt: string;
    declarationVersion: string;
    privacyVersion: string;
  } | null>(),
  sectionCompletion: jsonb("section_completion")
    .$type<ApplicationSectionCompletion>()
    .notNull()
    .default({
      business: false,
      declarations: false,
      documents: false,
      financial: false,
      project: false,
    }),
  rowVersion: integer("row_version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  uniqueIndex("app_applications_business_opportunity_unique")
    .on(table.businessId, table.fundingOpportunityId)
    .where(sql`${table.duplicatePolicy} = 'one_per_business' AND ${table.businessId} IS NOT NULL`),
  uniqueIndex("app_applications_applicant_opportunity_unique")
    .on(table.ownerUserId, table.fundingOpportunityId)
    .where(sql`${table.duplicatePolicy} = 'one_per_applicant'`),
  uniqueIndex("app_applications_unassigned_draft_unique")
    .on(table.ownerUserId, table.fundingOpportunityId)
    .where(sql`${table.duplicatePolicy} = 'one_per_business' AND ${table.businessId} IS NULL AND ${table.status} = 'draft'`),
  uniqueIndex("app_applications_reference_unique").on(table.reference),
  index("app_applications_owner_updated_idx").on(
    table.ownerUserId,
    table.updatedAt,
  ),
  index("app_applications_form_version_idx").on(table.formVersionId),
  index("app_applications_eligibility_version_idx").on(
    table.eligibilityRuleSetVersionId,
  ),
  index("app_applications_status_submitted_idx").on(
    table.status,
    table.submittedAt,
    table.id,
  ),
  check(
    "app_applications_status_check",
    sql`${table.status} in ('draft', 'submitted', 'withdrawn')`,
  ),
  check(
    "app_applications_duplicate_policy_check",
    sql`${table.duplicatePolicy} in ('one_per_applicant', 'one_per_business', 'none')`,
  ),
  check(
    "app_applications_row_version_check",
    sql`${table.rowVersion} > 0`,
  ),
  check(
    "app_applications_lifecycle_timestamps_check",
    sql`(${table.status} = 'draft' and ${table.submittedAt} is null and ${table.withdrawnAt} is null and ${table.reference} is null and ${table.submissionSnapshotId} is null)
      or (${table.status} = 'submitted' and ${table.submittedAt} is not null and ${table.withdrawnAt} is null and ${table.reference} is not null)
      or (${table.status} = 'withdrawn' and ${table.submittedAt} is not null and ${table.withdrawnAt} is not null and ${table.reference} is not null)`,
  ),
]);

export const applicationLifecycleHistory = pgTable(
  "app_application_lifecycle_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "restrict" }),
    sourceStatus: text("source_status")
      .$type<ApplicationLifecycleStatus>()
      .notNull(),
    targetStatus: text("target_status")
      .$type<ApplicationLifecycleStatus>()
      .notNull(),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    reason: text("reason"),
    sourceRowVersion: integer("source_row_version").notNull(),
    resultingRowVersion: integer("resulting_row_version").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("app_application_lifecycle_history_application_idx").on(
      table.applicationId,
      table.occurredAt,
      table.id,
    ),
    check(
      "app_application_lifecycle_history_status_check",
      sql`${table.sourceStatus} in ('draft', 'submitted', 'withdrawn')
        and ${table.targetStatus} in ('draft', 'submitted', 'withdrawn')`,
    ),
    check(
      "app_application_lifecycle_history_version_check",
      sql`${table.sourceRowVersion} > 0
        and ${table.resultingRowVersion} = ${table.sourceRowVersion} + 1`,
    ),
  ],
);

export const applicationDraftResponses = pgTable(
  "app_application_draft_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "restrict" }),
    formVersionId: uuid("form_version_id")
      .notNull()
      .references(() => formVersions.id, { onDelete: "restrict" }),
    respondentUserId: uuid("respondent_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    values: jsonb("values")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    rowVersion: integer("row_version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("app_application_draft_responses_application_unique").on(
      table.applicationId,
    ),
    index("app_application_draft_responses_form_version_idx").on(
      table.formVersionId,
    ),
    check(
      "app_application_draft_responses_row_version_check",
      sql`${table.rowVersion} > 0`,
    ),
  ],
);

export const applicationSubmissionSnapshots = pgTable(
  "app_application_submission_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "restrict" }),
    applicationRowVersion: integer("application_row_version").notNull(),
    responseRowVersion: integer("response_row_version").notNull(),
    formVersionId: uuid("form_version_id")
      .notNull()
      .references(() => formVersions.id, { onDelete: "restrict" }),
    eligibilityRuleSetVersionId: uuid("eligibility_rule_set_version_id")
      .notNull()
      .references(() => eligibilityRuleSetVersions.id, {
        onDelete: "restrict",
      }),
    workflowTemplateVersionId: uuid("workflow_template_version_id").notNull(),
    applicationData: jsonb("application_data")
      .$type<Record<string, unknown>>()
      .notNull(),
    businessData: jsonb("business_data")
      .$type<Record<string, unknown>>()
      .notNull(),
    declarationAcceptance: jsonb("declaration_acceptance")
      .$type<Record<string, unknown>>()
      .notNull(),
    documentVersions: jsonb("document_versions")
      .$type<Record<string, unknown>[]>()
      .notNull(),
    normalizedFormValues: jsonb("normalized_form_values")
      .$type<Record<string, unknown>>()
      .notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("app_submission_snapshots_application_unique").on(
      table.applicationId,
    ),
    check(
      "app_submission_snapshots_versions_check",
      sql`${table.applicationRowVersion} > 0 and ${table.responseRowVersion} > 0`,
    ),
  ],
);

export const applicationCommands = pgTable(
  "app_application_commands",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "restrict" }),
    commandType: text("command_type")
      .$type<"CREATE_DRAFT" | "SAVE_DRAFT_RESPONSE">()
      .notNull(),
    idempotencyKey: uuid("idempotency_key").notNull(),
    requestFingerprint: text("request_fingerprint").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("app_application_commands_actor_key_unique").on(
      table.actorUserId,
      table.idempotencyKey,
    ),
    index("app_application_commands_application_idx").on(
      table.applicationId,
      table.createdAt,
    ),
    check(
      "app_application_commands_type_check",
      sql`${table.commandType} in ('CREATE_DRAFT', 'SAVE_DRAFT_RESPONSE')`,
    ),
  ],
);

export const applicationAuditEntries = pgTable(
  "app_application_audit_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "restrict" }),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    action: text("action")
      .$type<
        | "APPLICATION_DRAFT_CREATED"
        | "APPLICATION_DRAFT_SAVED"
        | "APPLICATION_SUBMITTED"
      >()
      .notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    correlationId: uuid("correlation_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("app_application_audit_entries_application_idx").on(
      table.applicationId,
      table.createdAt,
      table.id,
    ),
    check(
      "app_application_audit_entries_action_check",
      sql`${table.action} in (
        'APPLICATION_DRAFT_CREATED',
        'APPLICATION_DRAFT_SAVED',
        'APPLICATION_SUBMITTED'
      )`,
    ),
  ],
);

export type ApplicationRecord = typeof applications.$inferSelect;
export type ApplicationDraftResponseRecord =
  typeof applicationDraftResponses.$inferSelect;
