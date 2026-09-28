import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import {
  workflowStageDefinitions,
  workflowTransitionDefinitions,
} from "./workflow.schema";
import { stageInstances, transitionExecutions } from "./workflow-runtime.schema";

export const workflowTransitionTargets = pgTable(
  "app_workflow_transition_targets",
  {
    transitionId: uuid("transition_id")
      .notNull()
      .references(() => workflowTransitionDefinitions.id, {
        onDelete: "restrict",
      }),
    targetStageId: uuid("target_stage_id")
      .notNull()
      .references(() => workflowStageDefinitions.id, {
        onDelete: "restrict",
      }),
  },
  (table) => [
    primaryKey({ columns: [table.transitionId, table.targetStageId] }),
    index("app_workflow_transition_targets_stage_idx").on(table.targetStageId),
  ],
);

export const workflowStageJoinPredecessors = pgTable(
  "app_workflow_stage_join_predecessors",
  {
    stageId: uuid("stage_id")
      .notNull()
      .references(() => workflowStageDefinitions.id, { onDelete: "restrict" }),
    predecessorStageId: uuid("predecessor_stage_id")
      .notNull()
      .references(() => workflowStageDefinitions.id, { onDelete: "restrict" }),
  },
  (table) => [
    primaryKey({ columns: [table.stageId, table.predecessorStageId] }),
    index("app_workflow_stage_join_predecessors_predecessor_idx").on(
      table.predecessorStageId,
    ),
    check(
      "app_workflow_stage_join_predecessors_distinct_check",
      sql`${table.stageId} <> ${table.predecessorStageId}`,
    ),
  ],
);

export const transitionExecutionTargets = pgTable(
  "app_workflow_transition_execution_targets",
  {
    executionId: uuid("execution_id")
      .notNull()
      .references(() => transitionExecutions.id, { onDelete: "restrict" }),
    targetStageDefinitionId: uuid("target_stage_definition_id")
      .notNull()
      .references(() => workflowStageDefinitions.id, { onDelete: "restrict" }),
    targetStageInstanceId: uuid("target_stage_instance_id")
      .references(() => stageInstances.id, { onDelete: "restrict" }),
    outcome: text("outcome")
      .$type<"ACTIVATED" | "ALREADY_ACTIVE" | "ENTRY_CONDITION_FAILED" | "JOIN_PENDING">()
      .notNull(),
  },
  (table) => [
    uniqueIndex("app_workflow_transition_execution_targets_unique").on(
      table.executionId,
      table.targetStageDefinitionId,
    ),
    index("app_workflow_transition_execution_targets_stage_idx").on(
      table.targetStageDefinitionId,
    ),
  ],
);
