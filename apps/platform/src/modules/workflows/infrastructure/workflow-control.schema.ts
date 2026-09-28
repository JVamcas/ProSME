import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "@/db/schema/identity";
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
