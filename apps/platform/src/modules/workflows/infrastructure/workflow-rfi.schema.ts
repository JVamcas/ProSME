import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "@/db/schema/identity";
import { applications } from "@/modules/applications/infrastructure/application.schema";
import type {
  WorkflowRfiContinuationBehavior,
  WorkflowRfiExpiryAction,
  WorkflowRfiInitiationType,
  WorkflowRfiStatus,
} from "../domain/runtime/WorkflowRfi";
import { workflowStageDocumentRequirements } from "./workflow-stage-requirements.schema";
import { workflowActionDefinitions } from "./workflow.schema";
import {
  stageInstances,
  workflowInstances,
  workflowTasks,
} from "./workflow-runtime.schema";
import { workflowDocumentEvidenceVersions } from "./workflow-evidence.schema";

export const workflowRfis = pgTable(
  "app_workflow_rfis",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id").notNull()
      .references(() => applications.id, { onDelete: "restrict" }),
    workflowInstanceId: uuid("workflow_instance_id").notNull()
      .references(() => workflowInstances.id, { onDelete: "restrict" }),
    stageInstanceId: uuid("stage_instance_id").notNull()
      .references(() => stageInstances.id, { onDelete: "restrict" }),
    taskId: uuid("task_id").notNull()
      .references(() => workflowTasks.id, { onDelete: "restrict" }),
    actionDefinitionId: uuid("action_definition_id").notNull()
      .references(() => workflowActionDefinitions.id, { onDelete: "restrict" }),
    requesterId: uuid("requester_id").notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    recipientUserId: uuid("recipient_user_id").notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    initiationType: text("initiation_type")
      .$type<WorkflowRfiInitiationType>().notNull(),
    status: text("status").$type<WorkflowRfiStatus>().notNull().default("OPEN"),
    question: text("question").notNull(),
    instructions: text("instructions").notNull(),
    editableFieldPaths: jsonb("editable_field_paths")
      .$type<string[]>().notNull().default([]),
    reminderDayOffsets: jsonb("reminder_day_offsets")
      .$type<number[]>().notNull().default([]),
    deadlineAt: timestamp("deadline_at", { withTimezone: true }).notNull(),
    expiryAction: text("expiry_action").$type<WorkflowRfiExpiryAction>().notNull(),
    continuationBehavior: text("continuation_behavior")
      .$type<WorkflowRfiContinuationBehavior>().notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    correlationId: uuid("correlation_id").notNull(),
    rowVersion: integer("row_version").notNull().default(1),
    continuationAppliedAt: timestamp("continuation_applied_at", {
      withTimezone: true,
    }),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    expiredAt: timestamp("expired_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("app_workflow_rfis_idempotency_unique").on(table.idempotencyKey),
    uniqueIndex("app_workflow_rfis_active_task_action_unique")
      .on(table.taskId, table.actionDefinitionId)
      .where(sql`${table.status} = 'OPEN'`),
    index("app_workflow_rfis_application_status_idx").on(
      table.applicationId,
      table.status,
      table.createdAt,
    ),
    index("app_workflow_rfis_task_status_idx").on(table.taskId, table.status),
    index("app_workflow_rfis_deadline_idx").on(table.status, table.deadlineAt),
    check(
      "app_workflow_rfis_status_check",
      sql`${table.status} in ('OPEN', 'RESPONDED', 'CLOSED', 'EXPIRED')`,
    ),
    check(
      "app_workflow_rfis_initiation_check",
      sql`${table.initiationType} in ('MANUAL', 'STAGE_ACTIVATION')`,
    ),
    check(
      "app_workflow_rfis_expiry_action_check",
      sql`${table.expiryAction} in ('CLOSE_REQUEST', 'ESCALATE', 'RETURN')`,
    ),
    check("app_workflow_rfis_row_version_check", sql`${table.rowVersion} > 0`),
    check(
      "app_workflow_rfis_fields_check",
      sql`jsonb_typeof(${table.editableFieldPaths}) = 'array'`,
    ),
    check(
      "app_workflow_rfis_reminders_check",
      sql`jsonb_typeof(${table.reminderDayOffsets}) = 'array'`,
    ),
  ],
);

export const workflowRfiParticipants = pgTable(
  "app_workflow_rfi_participants",
  {
    rfiId: uuid("rfi_id").notNull()
      .references(() => workflowRfis.id, { onDelete: "restrict" }),
    userId: uuid("user_id").notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    participantType: text("participant_type")
      .$type<"RECIPIENT" | "REQUESTER">().notNull(),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      columns: [table.rfiId, table.userId, table.participantType],
    }),
    check(
      "app_workflow_rfi_participants_type_check",
      sql`${table.participantType} in ('RECIPIENT', 'REQUESTER')`,
    ),
  ],
);

export const workflowRfiDocumentRequests = pgTable(
  "app_workflow_rfi_document_requests",
  {
    rfiId: uuid("rfi_id").notNull()
      .references(() => workflowRfis.id, { onDelete: "restrict" }),
    requirementId: uuid("requirement_id").notNull()
      .references(() => workflowStageDocumentRequirements.id, {
        onDelete: "restrict",
      }),
  },
  (table) => [primaryKey({ columns: [table.rfiId, table.requirementId] })],
);

export const workflowRfiResponses = pgTable(
  "app_workflow_rfi_responses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rfiId: uuid("rfi_id").notNull()
      .references(() => workflowRfis.id, { onDelete: "restrict" }),
    respondentUserId: uuid("respondent_user_id").notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    fieldValues: jsonb("field_values")
      .$type<Record<string, unknown>>().notNull().default({}),
    idempotencyKey: text("idempotency_key").notNull(),
    correlationId: uuid("correlation_id").notNull(),
    respondedAt: timestamp("responded_at", { withTimezone: true })
      .notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("app_workflow_rfi_responses_rfi_unique").on(table.rfiId),
    uniqueIndex("app_workflow_rfi_responses_idempotency_unique")
      .on(table.idempotencyKey),
    check(
      "app_workflow_rfi_responses_values_check",
      sql`jsonb_typeof(${table.fieldValues}) = 'object'`,
    ),
  ],
);

export const workflowRfiDrafts = pgTable(
  "app_workflow_rfi_drafts",
  {
    rfiId: uuid("rfi_id").primaryKey()
      .references(() => workflowRfis.id, { onDelete: "restrict" }),
    respondentUserId: uuid("respondent_user_id").notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    fieldValues: jsonb("field_values")
      .$type<Record<string, unknown>>().notNull().default({}),
    rowVersion: integer("row_version").notNull().default(1),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull().defaultNow(),
  },
  (table) => [
    check(
      "app_workflow_rfi_drafts_values_check",
      sql`jsonb_typeof(${table.fieldValues}) = 'object'`,
    ),
    check(
      "app_workflow_rfi_drafts_row_version_check",
      sql`${table.rowVersion} > 0`,
    ),
  ],
);

export const workflowRfiCorrespondence = pgTable(
  "app_workflow_rfi_correspondence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rfiId: uuid("rfi_id").notNull()
      .references(() => workflowRfis.id, { onDelete: "restrict" }),
    authorUserId: uuid("author_user_id").notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    authorType: text("author_type").$type<"APPLICANT" | "STAFF">().notNull(),
    entryType: text("entry_type")
      .$type<"REQUEST" | "FOLLOW_UP" | "RESPONSE">().notNull(),
    message: text("message").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull().defaultNow(),
  },
  (table) => [
    index("app_workflow_rfi_correspondence_history_idx").on(
      table.rfiId,
      table.createdAt,
      table.id,
    ),
    check(
      "app_workflow_rfi_correspondence_author_check",
      sql`${table.authorType} in ('APPLICANT', 'STAFF')`,
    ),
    check(
      "app_workflow_rfi_correspondence_entry_check",
      sql`${table.entryType} in ('REQUEST', 'FOLLOW_UP', 'RESPONSE')`,
    ),
    check(
      "app_workflow_rfi_correspondence_message_check",
      sql`length(trim(${table.message})) > 0`,
    ),
  ],
);

export const workflowRfiResponseDocuments = pgTable(
  "app_workflow_rfi_response_documents",
  {
    responseId: uuid("response_id").notNull()
      .references(() => workflowRfiResponses.id, { onDelete: "restrict" }),
    evidenceVersionId: uuid("evidence_version_id").notNull()
      .references(() => workflowDocumentEvidenceVersions.id, {
        onDelete: "restrict",
      }),
  },
  (table) => [primaryKey({ columns: [table.responseId, table.evidenceVersionId] })],
);

export const workflowRfiLifecycleEvents = pgTable(
  "app_workflow_rfi_lifecycle_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rfiId: uuid("rfi_id").notNull()
      .references(() => workflowRfis.id, { onDelete: "restrict" }),
    fromStatus: text("from_status").$type<WorkflowRfiStatus | null>(),
    toStatus: text("to_status").$type<WorkflowRfiStatus>().notNull(),
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "restrict",
    }),
    actorType: text("actor_type").$type<"SYSTEM" | "USER">().notNull(),
    correlationId: uuid("correlation_id").notNull(),
    details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull().defaultNow(),
  },
  (table) => [
    index("app_workflow_rfi_events_history_idx").on(
      table.rfiId,
      table.occurredAt,
      table.id,
    ),
    check(
      "app_workflow_rfi_events_actor_check",
      sql`(${table.actorType} = 'USER' and ${table.actorId} is not null)
        or (${table.actorType} = 'SYSTEM' and ${table.actorId} is null)`,
    ),
  ],
);
