import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "@/db/schema/identity";
import { workflowActionDefinitions } from "./workflow.schema";
import {
  stageInstances,
  workflowActionExecutions,
  workflowInstances,
  workflowTasks,
} from "./workflow-runtime.schema";

export const workflowDecisions = pgTable(
  "app_workflow_decisions",
  {
    id: uuid("id").primaryKey(),
    actionExecutionId: uuid("action_execution_id")
      .notNull()
      .references(() => workflowActionExecutions.id, { onDelete: "restrict" }),
    actionDefinitionId: uuid("action_definition_id")
      .notNull()
      .references(() => workflowActionDefinitions.id, { onDelete: "restrict" }),
    actionKey: text("action_key").notNull(),
    outcome: text("outcome").$type<"APPROVED" | "REJECTED">().notNull(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    workflowInstanceId: uuid("workflow_instance_id")
      .notNull()
      .references(() => workflowInstances.id, { onDelete: "restrict" }),
    sourceStageInstanceId: uuid("source_stage_instance_id")
      .notNull()
      .references(() => stageInstances.id, { onDelete: "restrict" }),
    taskId: uuid("task_id").references(() => workflowTasks.id, {
      onDelete: "restrict",
    }),
    input: jsonb("input").$type<Record<string, unknown>>().notNull(),
    decidedAt: timestamp("decided_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("app_workflow_decisions_execution_unique").on(
      table.actionExecutionId,
    ),
    index("app_workflow_decisions_instance_idx").on(
      table.workflowInstanceId,
      table.decidedAt,
    ),
    index("app_workflow_decisions_stage_idx").on(
      table.sourceStageInstanceId,
      table.decidedAt,
    ),
  ],
);
