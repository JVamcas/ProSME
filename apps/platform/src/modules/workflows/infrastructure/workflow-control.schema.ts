import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "@/db/schema/identity";
import { roles } from "@/db/schema/authorization";
import { fundingCalls } from "@/modules/funding-calls/infrastructure/funding-call.schema";
import {
  stageInstances,
  workflowActionExecutions,
  workflowInstances,
  workflowTasks,
} from "./workflow-runtime.schema";

export const workflowReworks = pgTable(
  "app_workflow_reworks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actionExecutionId: uuid("action_execution_id")
      .notNull()
      .references(() => workflowActionExecutions.id, { onDelete: "restrict" }),
    workflowInstanceId: uuid("workflow_instance_id")
      .notNull()
      .references(() => workflowInstances.id, { onDelete: "restrict" }),
    sourceStageInstanceId: uuid("source_stage_instance_id")
      .notNull()
      .references(() => stageInstances.id, { onDelete: "restrict" }),
    sourceTaskId: uuid("source_task_id").references(() => workflowTasks.id, {
      onDelete: "restrict",
    }),
    targetStageInstanceId: uuid("target_stage_instance_id")
      .notNull()
      .references(() => stageInstances.id, { onDelete: "restrict" }),
    continuationStageInstanceId: uuid("continuation_stage_instance_id")
      .references(() => stageInstances.id, { onDelete: "restrict" }),
    reason: text("reason").notNull(),
    dataHandling: text("data_handling")
      .$type<"RETAIN" | "CLEAR">()
      .notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("app_workflow_reworks_execution_unique").on(
      table.actionExecutionId,
    ),
    index("app_workflow_reworks_runtime_idx").on(
      table.workflowInstanceId,
      table.createdAt,
    ),
    check(
      "app_workflow_reworks_reason_check",
      sql`length(btrim(${table.reason})) > 0`,
    ),
    check(
      "app_workflow_reworks_data_handling_check",
      sql`${table.dataHandling} in ('RETAIN', 'CLEAR')`,
    ),
  ],
);

export const workflowReferrals = pgTable(
  "app_workflow_referrals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actionExecutionId: uuid("action_execution_id")
      .notNull()
      .references(() => workflowActionExecutions.id, { onDelete: "restrict" }),
    workflowInstanceId: uuid("workflow_instance_id")
      .notNull()
      .references(() => workflowInstances.id, { onDelete: "restrict" }),
    sourceStageInstanceId: uuid("source_stage_instance_id")
      .notNull()
      .references(() => stageInstances.id, { onDelete: "restrict" }),
    sourceTaskId: uuid("source_task_id")
      .notNull()
      .references(() => workflowTasks.id, { onDelete: "restrict" }),
    referredStageInstanceId: uuid("referred_stage_instance_id")
      .notNull()
      .references(() => stageInstances.id, { onDelete: "restrict" }),
    question: text("question").notNull(),
    sourceTaskBehavior: text("source_task_behavior")
      .$type<"BLOCKED" | "OPEN">()
      .notNull(),
    returnToReferrer: text("return_to_referrer")
      .$type<"YES" | "NO">()
      .notNull(),
    status: text("status")
      .$type<"ACTIVE" | "COMPLETED">()
      .notNull()
      .default("ACTIVE"),
    referredBy: uuid("referred_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    referredAt: timestamp("referred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    resolvedBy: uuid("resolved_by").references(() => users.id, {
      onDelete: "restrict",
    }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("app_workflow_referrals_execution_unique").on(
      table.actionExecutionId,
    ),
    uniqueIndex("app_workflow_referrals_active_source_unique")
      .on(table.sourceTaskId)
      .where(sql`${table.status} = 'ACTIVE'`),
    index("app_workflow_referrals_referred_stage_idx").on(
      table.referredStageInstanceId,
      table.status,
    ),
    check(
      "app_workflow_referrals_question_check",
      sql`length(btrim(${table.question})) > 0`,
    ),
    check(
      "app_workflow_referrals_behavior_check",
      sql`${table.sourceTaskBehavior} in ('BLOCKED', 'OPEN')`,
    ),
    check(
      "app_workflow_referrals_return_check",
      sql`${table.returnToReferrer} in ('YES', 'NO')`,
    ),
    check(
      "app_workflow_referrals_status_check",
      sql`${table.status} in ('ACTIVE', 'COMPLETED')`,
    ),
  ],
);

export const workflowHolds = pgTable(
  "app_workflow_holds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actionExecutionId: uuid("action_execution_id")
      .notNull()
      .references(() => workflowActionExecutions.id, { onDelete: "restrict" }),
    workflowInstanceId: uuid("workflow_instance_id")
      .notNull()
      .references(() => workflowInstances.id, { onDelete: "restrict" }),
    stageInstanceId: uuid("stage_instance_id")
      .notNull()
      .references(() => stageInstances.id, { onDelete: "restrict" }),
    taskId: uuid("task_id").references(() => workflowTasks.id, {
      onDelete: "restrict",
    }),
    scope: text("scope").$type<"STAGE">().notNull().default("STAGE"),
    previousStageStatus: text("previous_stage_status")
      .$type<"ACTIVE">()
      .notNull(),
    reasonCode: text("reason_code"),
    comment: text("comment"),
    reviewAt: timestamp("review_at", { withTimezone: true }),
    status: text("status")
      .$type<"ACTIVE" | "RESUMED">()
      .notNull()
      .default("ACTIVE"),
    heldBy: uuid("held_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    heldAt: timestamp("held_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    resumedBy: uuid("resumed_by").references(() => users.id, {
      onDelete: "restrict",
    }),
    resumedAt: timestamp("resumed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("app_workflow_holds_execution_unique").on(
      table.actionExecutionId,
    ),
    uniqueIndex("app_workflow_holds_active_stage_unique")
      .on(table.stageInstanceId)
      .where(sql`${table.status} = 'ACTIVE'`),
    index("app_workflow_holds_runtime_idx").on(
      table.workflowInstanceId,
      table.heldAt,
    ),
    index("app_workflow_holds_review_idx")
      .on(table.reviewAt)
      .where(sql`${table.status} = 'ACTIVE'`),
    check("app_workflow_holds_scope_check", sql`${table.scope} = 'STAGE'`),
    check(
      "app_workflow_holds_status_check",
      sql`${table.status} in ('ACTIVE', 'RESUMED')`,
    ),
    check(
      "app_workflow_holds_reason_check",
      sql`${table.reasonCode} is not null or length(btrim(coalesce(${table.comment}, ''))) > 0`,
    ),
  ],
);

export const workflowDeferrals = pgTable(
  "app_workflow_deferrals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actionExecutionId: uuid("action_execution_id")
      .notNull()
      .references(() => workflowActionExecutions.id, { onDelete: "restrict" }),
    workflowInstanceId: uuid("workflow_instance_id")
      .notNull()
      .references(() => workflowInstances.id, { onDelete: "restrict" }),
    stageInstanceId: uuid("stage_instance_id")
      .notNull()
      .references(() => stageInstances.id, { onDelete: "restrict" }),
    taskId: uuid("task_id").references(() => workflowTasks.id, {
      onDelete: "restrict",
    }),
    mode: text("mode").$type<"DATE" | "FUNDING_CALL">().notNull(),
    continuation: text("continuation")
      .$type<"RESUME_ON_DATE" | "EXPLICIT_TRANSFER">()
      .notNull(),
    reasonCode: text("reason_code"),
    comment: text("comment"),
    resumeAt: timestamp("resume_at", { withTimezone: true }),
    targetFundingCallId: uuid("target_funding_call_id").references(
      () => fundingCalls.id,
      { onDelete: "restrict" },
    ),
    previousStageStatus: text("previous_stage_status")
      .$type<"ACTIVE">()
      .notNull(),
    status: text("status")
      .$type<"ACTIVE" | "RESUMED" | "TRANSFERRED">()
      .notNull()
      .default("ACTIVE"),
    deferredBy: uuid("deferred_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    deferredAt: timestamp("deferred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    resumedBy: uuid("resumed_by").references(() => users.id, {
      onDelete: "restrict",
    }),
    resumedAt: timestamp("resumed_at", { withTimezone: true }),
    resumeActionExecutionId: uuid("resume_action_execution_id").references(
      () => workflowActionExecutions.id,
      { onDelete: "restrict" },
    ),
  },
  (table) => [
    uniqueIndex("app_workflow_deferrals_execution_unique").on(
      table.actionExecutionId,
    ),
    uniqueIndex("app_workflow_deferrals_active_stage_unique")
      .on(table.stageInstanceId)
      .where(sql`${table.status} = 'ACTIVE'`),
    index("app_workflow_deferrals_resume_idx").on(table.status, table.resumeAt),
    check(
      "app_workflow_deferrals_mode_check",
      sql`${table.mode} in ('DATE', 'FUNDING_CALL')`,
    ),
    check(
      "app_workflow_deferrals_status_check",
      sql`${table.status} in ('ACTIVE', 'RESUMED', 'TRANSFERRED')`,
    ),
    check(
      "app_workflow_deferrals_reason_check",
      sql`${table.reasonCode} is not null or length(btrim(coalesce(${table.comment}, ''))) > 0`,
    ),
    check(
      "app_workflow_deferrals_target_check",
      sql`(${table.mode} = 'DATE' and ${table.continuation} = 'RESUME_ON_DATE'
          and ${table.resumeAt} is not null and ${table.targetFundingCallId} is null)
        or (${table.mode} = 'FUNDING_CALL'
          and ${table.continuation} = 'EXPLICIT_TRANSFER'
          and ${table.resumeAt} is null and ${table.targetFundingCallId} is not null)`,
    ),
  ],
);

export const workflowEscalations = pgTable(
  "app_workflow_escalations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actionExecutionId: uuid("action_execution_id")
      .notNull()
      .references(() => workflowActionExecutions.id, { onDelete: "restrict" }),
    workflowInstanceId: uuid("workflow_instance_id")
      .notNull()
      .references(() => workflowInstances.id, { onDelete: "restrict" }),
    stageInstanceId: uuid("stage_instance_id")
      .notNull()
      .references(() => stageInstances.id, { onDelete: "restrict" }),
    taskId: uuid("task_id")
      .notNull()
      .references(() => workflowTasks.id, { onDelete: "restrict" }),
    trigger: text("trigger")
      .$type<"MANUAL" | "SLA_BREACH" | "CONDITION" | "RFI_EXPIRY">()
      .notNull(),
    targetType: text("target_type").$type<"ROLE" | "USER">().notNull(),
    targetRoleId: uuid("target_role_id").references(() => roles.id, {
      onDelete: "restrict",
    }),
    targetUserId: uuid("target_user_id").references(() => users.id, {
      onDelete: "restrict",
    }),
    responsibility: text("responsibility")
      .$type<"RETAIN" | "SHARE" | "TRANSFER">()
      .notNull(),
    blockUntilResolved: boolean("block_until_resolved").notNull(),
    sourceAssignedRoleId: uuid("source_assigned_role_id").references(
      () => roles.id,
      { onDelete: "restrict" },
    ),
    sourceAssignedUserId: uuid("source_assigned_user_id").references(
      () => users.id,
      { onDelete: "restrict" },
    ),
    reasonCode: text("reason_code"),
    comment: text("comment"),
    status: text("status")
      .$type<"ACTIVE" | "RESOLVED">()
      .notNull()
      .default("ACTIVE"),
    escalatedBy: uuid("escalated_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    escalatedAt: timestamp("escalated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    resolvedBy: uuid("resolved_by").references(() => users.id, {
      onDelete: "restrict",
    }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolutionActionExecutionId: uuid("resolution_action_execution_id")
      .references(() => workflowActionExecutions.id, { onDelete: "restrict" }),
  },
  (table) => [
    uniqueIndex("app_workflow_escalations_execution_unique").on(
      table.actionExecutionId,
    ),
    uniqueIndex("app_workflow_escalations_active_task_unique")
      .on(table.taskId)
      .where(sql`${table.status} = 'ACTIVE'`),
    index("app_workflow_escalations_runtime_idx").on(
      table.workflowInstanceId,
      table.status,
    ),
    check(
      "app_workflow_escalations_trigger_check",
      sql`${table.trigger} in ('MANUAL', 'SLA_BREACH', 'CONDITION', 'RFI_EXPIRY')`,
    ),
    check(
      "app_workflow_escalations_responsibility_check",
      sql`${table.responsibility} in ('RETAIN', 'SHARE', 'TRANSFER')`,
    ),
    check(
      "app_workflow_escalations_status_check",
      sql`${table.status} in ('ACTIVE', 'RESOLVED')`,
    ),
    check(
      "app_workflow_escalations_target_check",
      sql`(${table.targetType} = 'ROLE' and ${table.targetRoleId} is not null
          and ${table.targetUserId} is null)
        or (${table.targetType} = 'USER' and ${table.targetUserId} is not null
          and ${table.targetRoleId} is null)`,
    ),
    check(
      "app_workflow_escalations_reason_check",
      sql`${table.reasonCode} is not null or length(btrim(coalesce(${table.comment}, ''))) > 0`,
    ),
  ],
);
