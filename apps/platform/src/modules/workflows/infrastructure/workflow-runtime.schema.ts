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

import type { TaskTypeCode } from "@/modules/workflows/domain/definitions/WorkflowTypes";
import type { WorkflowInstanceStatus } from "@/modules/workflows/domain/runtime/WorkflowInstance";
import type { StageInstanceStatus } from "@/modules/workflows/domain/runtime/StageInstance";
import type { WorkflowTaskStatus } from "@/modules/workflows/domain/runtime/WorkflowTask";
import type { TransitionExecutionOutcome } from "@/modules/workflows/domain/runtime/TransitionExecution";
import type { WorkflowActionType } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
import { formVersions } from "@/modules/forms/infrastructure/form.schema";
import { applications } from "@/db/schema/applications";
import { roles } from "@/db/schema/authorization";
import { users } from "@/db/schema/identity";
import {
  stageTaskDefinitions,
  workflowDefinitionVersions,
  workflowStageDefinitions,
  workflowActionDefinitions,
  workflowTransitionDefinitions,
} from "@/modules/workflows/infrastructure/workflow.schema";

export const workflowInstances = pgTable(
  "app_workflow_instances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "restrict" }),
    workflowTemplateVersionId: uuid("workflow_template_version_id")
      .notNull()
      .references(() => workflowDefinitionVersions.id, {
        onDelete: "restrict",
      }),
    status: text("status").$type<WorkflowInstanceStatus>()
      .notNull()
      .default("ACTIVE"),
    currentStageInstanceId: uuid("current_stage_instance_id").references(
      (): AnyPgColumn => stageInstances.id,
      { onDelete: "restrict" },
    ),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("app_workflow_instances_application_unique").on(
      table.applicationId,
    ),
    index("app_workflow_instances_template_version_idx").on(
      table.workflowTemplateVersionId,
    ),
  ],
);

export const stageInstances = pgTable(
  "app_workflow_stage_instances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workflowInstanceId: uuid("workflow_instance_id")
      .notNull()
      .references(() => workflowInstances.id, { onDelete: "restrict" }),
    workflowStageDefinitionId: uuid("workflow_stage_definition_id")
      .notNull()
      .references(() => workflowStageDefinitions.id, {
        onDelete: "restrict",
      }),
    status: text("status").$type<StageInstanceStatus>()
      .notNull()
      .default("ACTIVE"),
    iterationNumber: integer("iteration_number").notNull().default(1),
    rowVersion: integer("row_version").notNull().default(1),
    referralContext: jsonb("referral_context")
      .$type<Record<string, unknown> | null>(),
    returnContext: jsonb("return_context")
      .$type<Record<string, unknown> | null>(),
    activatedAt: timestamp("activated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("app_workflow_stage_instances_iteration_unique").on(
      table.workflowInstanceId,
      table.workflowStageDefinitionId,
      table.iterationNumber,
    ),
    index("app_workflow_stage_instances_workflow_status_idx").on(
      table.workflowInstanceId,
      table.status,
    ),
  ],
);

export const workflowActionExecutions = pgTable(
  "app_workflow_action_executions",
  {
    id: uuid("id").primaryKey(),
    actionDefinitionId: uuid("action_definition_id")
      .notNull()
      .references(() => workflowActionDefinitions.id, { onDelete: "restrict" }),
    actionKey: text("action_key").notNull(),
    actionType: text("action_type").$type<WorkflowActionType>().notNull(),
    actorType: text("actor_type").$type<"USER" | "SYSTEM">().notNull(),
    actorId: uuid("actor_id").references(() => users.id, {
      onDelete: "restrict",
    }),
    actorIdentifier: text("actor_identifier").notNull(),
    workflowInstanceId: uuid("workflow_instance_id")
      .notNull()
      .references(() => workflowInstances.id, { onDelete: "restrict" }),
    sourceStageInstanceId: uuid("source_stage_instance_id")
      .notNull()
      .references(() => stageInstances.id, { onDelete: "restrict" }),
    taskId: uuid("task_id").references((): AnyPgColumn => workflowTasks.id, {
      onDelete: "restrict",
    }),
    reasonCode: text("reason_code"),
    comment: text("comment"),
    normalizedInput: jsonb("normalized_input")
      .$type<Record<string, unknown>>()
      .notNull(),
    resolvedTarget: jsonb("resolved_target")
      .$type<Record<string, unknown> | null>(),
    conditionEvaluation: jsonb("condition_evaluation")
      .$type<Record<string, unknown>>()
      .notNull(),
    expectedRuntimeVersion: integer("expected_runtime_version").notNull(),
    resultingRuntimeVersion: integer("resulting_runtime_version").notNull(),
    result: jsonb("result").$type<Record<string, unknown>>().notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    correlationId: uuid("correlation_id").notNull(),
    executedAt: timestamp("executed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("app_workflow_action_executions_idempotency_unique").on(
      table.idempotencyKey,
    ),
    index("app_workflow_action_executions_runtime_idx").on(
      table.workflowInstanceId,
      table.executedAt,
    ),
    index("app_workflow_action_executions_stage_idx").on(
      table.sourceStageInstanceId,
      table.executedAt,
    ),
  ],
);

export const workflowTasks = pgTable(
  "app_workflow_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stageInstanceId: uuid("stage_instance_id")
      .notNull()
      .references(() => stageInstances.id, { onDelete: "restrict" }),
    workflowTaskDefinitionId: uuid("workflow_task_definition_id")
      .notNull()
      .references(() => stageTaskDefinitions.id, { onDelete: "restrict" }),
    typeSnapshot: text("type_snapshot").$type<TaskTypeCode>().notNull(),
    formVersionId: uuid("form_version_id").references(() => formVersions.id, {
      onDelete: "restrict",
    }),
    status: text("status")
      .$type<WorkflowTaskStatus>()
      .notNull()
      .default("PENDING"),
    assignedRoleId: uuid("assigned_role_id").references(() => roles.id, {
      onDelete: "restrict",
    }),
    assignedUserId: uuid("assigned_user_id").references(() => users.id, {
      onDelete: "restrict",
    }),
    dueAt: timestamp("due_at", { withTimezone: true }),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    result: jsonb("result").$type<Record<string, unknown> | null>(),
    rowVersion: integer("row_version").notNull().default(1),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("app_workflow_tasks_definition_unique").on(
      table.stageInstanceId,
      table.workflowTaskDefinitionId,
    ),
    index("app_workflow_tasks_assignment_idx").on(
      table.status,
      table.assignedRoleId,
      table.assignedUserId,
    ),
  ],
);

export const transitionExecutions = pgTable(
  "app_workflow_transition_executions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workflowInstanceId: uuid("workflow_instance_id")
      .notNull()
      .references(() => workflowInstances.id, { onDelete: "restrict" }),
    sourceStageInstanceId: uuid("source_stage_instance_id")
      .notNull()
      .references(() => stageInstances.id, { onDelete: "restrict" }),
    transitionDefinitionId: uuid("transition_definition_id")
      .notNull()
      .references(() => workflowTransitionDefinitions.id, {
        onDelete: "restrict",
      }),
    actionKey: text("action_key").notNull(),
    targetStageDefinitionId: uuid("target_stage_definition_id")
      .references(() => workflowStageDefinitions.id, { onDelete: "restrict" }),
    targetStageInstanceId: uuid("target_stage_instance_id")
      .references(() => stageInstances.id, { onDelete: "restrict" }),
    outcome: text("outcome")
      .$type<TransitionExecutionOutcome>()
      .notNull()
      .default("RECORDED"),
    conditionEvaluation: jsonb("condition_evaluation")
      .$type<Record<string, unknown>>()
      .notNull(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    correlationId: uuid("correlation_id").notNull(),
    executedAt: timestamp("executed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("app_workflow_transition_executions_source_unique").on(
      table.sourceStageInstanceId,
    ),
    index("app_workflow_transition_executions_instance_idx").on(
      table.workflowInstanceId,
      table.executedAt,
    ),
  ],
);

export const taskClaimCommands = pgTable(
  "app_task_claim_commands",
  {
    idempotencyKey: text("idempotency_key").primaryKey(),
    taskInstanceId: uuid("task_instance_id")
      .notNull()
      .references(() => workflowTasks.id, { onDelete: "restrict" }),
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
      .references(() => workflowTasks.id, { onDelete: "restrict" }),
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
