import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { users } from "@/db/schema/identity";
import { stageTaskDefinitions } from "./workflow.schema";
import { stageInstances, workflowTasks } from "./workflow-runtime.schema";

export const reviewThresholdEvaluations = pgTable(
  "app_workflow_review_threshold_evaluations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stageInstanceId: uuid("stage_instance_id").notNull()
      .references(() => stageInstances.id, { onDelete: "restrict" }),
    taskDefinitionId: uuid("task_definition_id").notNull()
      .references(() => stageTaskDefinitions.id, { onDelete: "restrict" }),
    rule: jsonb("rule").notNull(),
    denominator: integer("denominator").notNull(),
    requiredCount: integer("required_count").notNull(),
    completedTaskIds: uuid("completed_task_ids").array().notNull(),
    satisfied: boolean("satisfied").notNull(),
    firstSatisfied: boolean("first_satisfied").notNull().default(false),
    triggerTaskId: uuid("trigger_task_id")
      .references(() => workflowTasks.id, { onDelete: "restrict" }),
    evaluatedAt: timestamp("evaluated_at", { withTimezone: true })
      .notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("app_workflow_review_threshold_first_unique").on(
      table.stageInstanceId,
      table.taskDefinitionId,
    ).where(sql`${table.firstSatisfied} = true`),
    index("app_workflow_review_threshold_stage_idx").on(
      table.stageInstanceId,
      table.taskDefinitionId,
      table.evaluatedAt,
    ),
  ],
);

export const workflowQuorumParticipants = pgTable(
  "app_workflow_quorum_participants",
  {
    stageInstanceId: uuid("stage_instance_id").notNull()
      .references(() => stageInstances.id, { onDelete: "restrict" }),
    userId: uuid("user_id").notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    responsibility: text("responsibility").notNull(),
    isChair: boolean("is_chair").notNull().default(false),
    attendance: text("attendance")
      .$type<"PRESENT" | "ABSENT" | "RECUSED">().notNull(),
    coiCleared: boolean("coi_cleared").notNull().default(false),
    abstained: boolean("abstained").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull().defaultNow(),
    updatedBy: uuid("updated_by").notNull()
      .references(() => users.id, { onDelete: "restrict" }),
  },
  (table) => [
    primaryKey({
      columns: [table.stageInstanceId, table.userId],
    }),
  ],
);

export const workflowQuorumEvaluations = pgTable(
  "app_workflow_quorum_evaluations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stageInstanceId: uuid("stage_instance_id").notNull()
      .references(() => stageInstances.id, { onDelete: "restrict" }),
    taskDefinitionId: uuid("task_definition_id").notNull()
      .references(() => stageTaskDefinitions.id, { onDelete: "restrict" }),
    rule: jsonb("rule").notNull(),
    eligibleDenominator: integer("eligible_denominator").notNull(),
    presentUserIds: uuid("present_user_ids").array().notNull(),
    clearedUserIds: uuid("cleared_user_ids").array().notNull(),
    recusedUserIds: uuid("recused_user_ids").array().notNull(),
    absentUserIds: uuid("absent_user_ids").array().notNull(),
    satisfied: boolean("satisfied").notNull(),
    triggerActorId: uuid("trigger_actor_id")
      .references(() => users.id, { onDelete: "restrict" }),
    evaluatedAt: timestamp("evaluated_at", { withTimezone: true })
      .notNull().defaultNow(),
  },
  (table) => [
    index("app_workflow_quorum_stage_idx").on(
      table.stageInstanceId,
      table.taskDefinitionId,
      table.evaluatedAt,
    ),
  ],
);
