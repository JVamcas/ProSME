import {
  type AnyPgColumn,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type { TaskTypeCode } from "@/modules/workflows/WorkflowTypes";
import { applications } from "./applications";
import { roles } from "./authorization";
import { users } from "./identity";
import {
  stageTaskDefinitions,
  workflowDefinitionVersions,
  workflowStageDefinitions,
} from "./workflow";

export const workflowInstances = pgTable(
  "app_workflow_instances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "restrict" }),
    workflowVersionId: uuid("workflow_version_id")
      .notNull()
      .references(() => workflowDefinitionVersions.id, {
        onDelete: "restrict",
      }),
    status: text("status").$type<"ACTIVE" | "COMPLETED" | "CANCELLED">()
      .notNull()
      .default("ACTIVE"),
    currentStageInstanceId: uuid("current_stage_instance_id").references(
      (): AnyPgColumn => workflowStageInstances.id,
      { onDelete: "restrict" },
    ),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("app_workflow_instances_application_unique").on(
      table.applicationId,
    ),
    index("app_workflow_instances_version_idx").on(table.workflowVersionId),
  ],
);

export const workflowStageInstances = pgTable(
  "app_workflow_stage_instances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workflowInstanceId: uuid("workflow_instance_id")
      .notNull()
      .references(() => workflowInstances.id, { onDelete: "restrict" }),
    stageDefinitionId: uuid("stage_definition_id")
      .notNull()
      .references(() => workflowStageDefinitions.id, {
        onDelete: "restrict",
      }),
    status: text("status")
      .$type<"NOT_STARTED" | "ACTIVE" | "BLOCKED" | "COMPLETED" | "CANCELLED">()
      .notNull()
      .default("ACTIVE"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("app_workflow_stage_instances_definition_unique").on(
      table.workflowInstanceId,
      table.stageDefinitionId,
    ),
  ],
);

export const stageTaskInstances = pgTable(
  "app_stage_task_instances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stageInstanceId: uuid("stage_instance_id")
      .notNull()
      .references(() => workflowStageInstances.id, { onDelete: "restrict" }),
    taskDefinitionId: uuid("task_definition_id")
      .notNull()
      .references(() => stageTaskDefinitions.id, { onDelete: "restrict" }),
    typeSnapshot: text("type_snapshot").$type<TaskTypeCode>().notNull(),
    status: text("status").notNull().default("READY"),
    assignmentRoleId: uuid("assignment_role_id").references(() => roles.id, {
      onDelete: "restrict",
    }),
    assignmentUserId: uuid("assignment_user_id").references(() => users.id, {
      onDelete: "restrict",
    }),
    dueAt: timestamp("due_at", { withTimezone: true }),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    result: jsonb("result").$type<Record<string, unknown> | null>(),
    rowVersion: integer("row_version").notNull().default(1),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("app_stage_task_instances_definition_unique").on(
      table.stageInstanceId,
      table.taskDefinitionId,
    ),
    index("app_stage_task_instances_assignment_idx").on(
      table.status,
      table.assignmentRoleId,
      table.assignmentUserId,
    ),
  ],
);

export const taskClaimCommands = pgTable(
  "app_task_claim_commands",
  {
    idempotencyKey: text("idempotency_key").primaryKey(),
    taskInstanceId: uuid("task_instance_id")
      .notNull()
      .references(() => stageTaskInstances.id, { onDelete: "restrict" }),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    claimedAt: timestamp("claimed_at", { withTimezone: true }).notNull(),
    rowVersion: integer("row_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("app_task_claim_commands_task_idx").on(table.taskInstanceId)],
);

export const taskCompletionCommands = pgTable(
  "app_task_completion_commands",
  {
    idempotencyKey: text("idempotency_key").primaryKey(),
    taskInstanceId: uuid("task_instance_id")
      .notNull()
      .references(() => stageTaskInstances.id, { onDelete: "restrict" }),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    result: jsonb("result").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull(),
    rowVersion: integer("row_version").notNull(),
    nextStageName: text("next_stage_name"),
    workflowStatus: text("workflow_status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("app_task_completion_commands_task_idx").on(table.taskInstanceId),
  ],
);

export const workflowEvents = pgTable(
  "app_workflow_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workflowInstanceId: uuid("workflow_instance_id")
      .notNull()
      .references(() => workflowInstances.id, { onDelete: "restrict" }),
    eventCode: text("event_code").notNull(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    correlationId: uuid("correlation_id").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("app_workflow_events_created_idx").on(table.createdAt, table.id),
    index("app_workflow_events_instance_idx").on(
      table.workflowInstanceId,
      table.createdAt,
    ),
  ],
);

export const transactionalOutbox = pgTable(
  "app_transactional_outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventCode: text("event_code").notNull(),
    aggregateId: uuid("aggregate_id").notNull(),
    schemaVersion: integer("schema_version").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    correlationId: uuid("correlation_id").notNull(),
    status: text("status").notNull().default("PENDING"),
    attemptCount: integer("attempt_count").notNull().default(0),
    availableAt: timestamp("available_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("app_transactional_outbox_event_aggregate_unique").on(
      table.eventCode,
      table.aggregateId,
    ),
    index("app_transactional_outbox_pending_idx").on(
      table.status,
      table.availableAt,
    ),
  ],
);

export const applicationSubmissionCommands = pgTable(
  "app_application_submission_commands",
  {
    applicationId: uuid("application_id")
      .primaryKey()
      .references(() => applications.id, { onDelete: "restrict" }),
    idempotencyKey: text("idempotency_key").notNull(),
    reference: text("reference").notNull(),
    workflowInstanceId: uuid("workflow_instance_id")
      .notNull()
      .references(() => workflowInstances.id, { onDelete: "restrict" }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("app_submission_commands_key_unique").on(
      table.idempotencyKey,
    ),
  ],
);
