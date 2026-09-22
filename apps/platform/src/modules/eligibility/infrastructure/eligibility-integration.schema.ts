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
import type { JsonValue } from "@/modules/conditions/domain/Operand";
import { fundingCalls } from "@/modules/funding-calls/infrastructure/funding-call.schema";
import { workflowDefinitionVersions } from "@/modules/workflows/infrastructure/workflow.schema";
import type {
  EligibilityIntegrationExecutionPolicy,
  EligibilityIntegrationOutputDefinition,
  EligibilityIntegrationRawResponsePolicy,
  EligibilityIntegrationResultStatus,
  EligibilityIntegrationVersionStatus,
} from "../domain/EligibilityIntegration";

export const eligibilityIntegrationDefinitions = pgTable(
  "app_eligibility_integration_definitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stableKey: text("stable_key").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    createdBy: uuid("created_by").notNull().references(() => users.id, {
      onDelete: "restrict",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("app_eligibility_integrations_stable_key_unique")
      .on(table.stableKey),
  ],
);

export const eligibilityIntegrationVersions = pgTable(
  "app_eligibility_integration_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    definitionId: uuid("definition_id")
      .notNull()
      .references(() => eligibilityIntegrationDefinitions.id, {
        onDelete: "restrict",
      }),
    versionNumber: integer("version_number").notNull(),
    status: text("status")
      .$type<EligibilityIntegrationVersionStatus>()
      .notNull()
      .default("DRAFT"),
    outputSchema: jsonb("output_schema")
      .$type<EligibilityIntegrationOutputDefinition[]>()
      .notNull(),
    retryPolicy: jsonb("retry_policy")
      .$type<EligibilityIntegrationExecutionPolicy>()
      .notNull(),
    rawResponsePolicy: jsonb("raw_response_policy")
      .$type<EligibilityIntegrationRawResponsePolicy>()
      .notNull(),
    createdBy: uuid("created_by").notNull().references(() => users.id, {
      onDelete: "restrict",
    }),
    publishedBy: uuid("published_by").references(() => users.id, {
      onDelete: "restrict",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    retiredAt: timestamp("retired_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("app_eligibility_integration_versions_number_unique").on(
      table.definitionId,
      table.versionNumber,
    ),
    index("app_eligibility_integration_versions_status_idx").on(table.status),
    check(
      "app_eligibility_integration_versions_status_check",
      sql`${table.status} in ('DRAFT', 'PUBLISHED', 'RETIRED')`,
    ),
    check(
      "app_eligibility_integration_versions_number_check",
      sql`${table.versionNumber} > 0`,
    ),
    check(
      "app_eligibility_integration_versions_outputs_check",
      sql`jsonb_typeof(${table.outputSchema}) = 'array'
        and jsonb_array_length(${table.outputSchema}) > 0`,
    ),
  ],
);

export const fundingCallEligibilityIntegrationBindings = pgTable(
  "app_funding_call_eligibility_integration_bindings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fundingCallId: uuid("funding_call_id")
      .notNull()
      .references(() => fundingCalls.id, { onDelete: "restrict" }),
    workflowTemplateVersionId: uuid("workflow_template_version_id")
      .notNull()
      .references(() => workflowDefinitionVersions.id, {
        onDelete: "restrict",
      }),
    integrationVersionId: uuid("integration_version_id")
      .notNull()
      .references(() => eligibilityIntegrationVersions.id, {
        onDelete: "restrict",
      }),
    manualFallbackAllowed: boolean("manual_fallback_allowed")
      .notNull()
      .default(false),
    providerAdapterKey: text("provider_adapter_key").notNull(),
    providerDisplayName: text("provider_display_name").notNull(),
    secretReference: text("secret_reference"),
    createdBy: uuid("created_by").notNull().references(() => users.id, {
      onDelete: "restrict",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("app_funding_call_integration_version_unique").on(
      table.fundingCallId,
      table.integrationVersionId,
    ),
    index("app_funding_call_integration_workflow_idx").on(
      table.workflowTemplateVersionId,
    ),
  ],
);

export const eligibilityIntegrationExecutions = pgTable(
  "app_eligibility_integration_executions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "restrict" }),
    bindingId: uuid("binding_id")
      .notNull()
      .references(() => fundingCallEligibilityIntegrationBindings.id, {
        onDelete: "restrict",
      }),
    status: text("status")
      .$type<EligibilityIntegrationResultStatus>()
      .notNull(),
    executionSource: text("execution_source")
      .$type<"PROVIDER" | "MANUAL">()
      .notNull(),
    attemptCount: integer("attempt_count").notNull(),
    normalizedOutputs: jsonb("normalized_outputs")
      .$type<Record<string, JsonValue>>()
      .notNull()
      .default({}),
    rawResponse: jsonb("raw_response").$type<JsonValue | null>(),
    rawResponseExpiresAt: timestamp("raw_response_expires_at", {
      withTimezone: true,
    }),
    failureMessage: text("failure_message"),
    evidenceReference: text("evidence_reference"),
    executedBy: uuid("executed_by").references(() => users.id, {
      onDelete: "restrict",
    }),
    executedAt: timestamp("executed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("app_eligibility_integration_execution_latest_idx").on(
      table.applicationId,
      table.bindingId,
      table.executedAt,
    ),
    check(
      "app_eligibility_integration_execution_status_check",
      sql`${table.status} in (
        'SUCCEEDED', 'NEGATIVE', 'UNAVAILABLE', 'TIMED_OUT'
      )`,
    ),
    check(
      "app_eligibility_integration_execution_source_check",
      sql`${table.executionSource} in ('PROVIDER', 'MANUAL')`,
    ),
    check(
      "app_eligibility_integration_execution_attempts_check",
      sql`${table.attemptCount} > 0`,
    ),
    check(
      "app_eligibility_integration_execution_manual_check",
      sql`(${table.executionSource} = 'MANUAL'
          and ${table.executedBy} is not null
          and length(btrim(${table.evidenceReference})) > 0)
        or (${table.executionSource} = 'PROVIDER'
          and ${table.executedBy} is null
          and ${table.evidenceReference} is null)`,
    ),
  ],
);
