import {
  bigint,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "@/db/schema/identity";
import {
  stageInstances,
  workflowInstances,
  workflowTasks,
} from "./workflow-runtime.schema";

export const workflowAuditEntries = pgTable(
  "app_workflow_audit_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runtimeSequence: bigint("runtime_sequence", { mode: "number" })
      .generatedAlwaysAsIdentity(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    correlationId: uuid("correlation_id").notNull(),
    idempotencyKey: text("idempotency_key"),
    workflowInstanceId: uuid("workflow_instance_id").references(
      () => workflowInstances.id,
      { onDelete: "restrict" },
    ),
    stageInstanceId: uuid("stage_instance_id").references(
      () => stageInstances.id,
      { onDelete: "restrict" },
    ),
    taskId: uuid("task_id").references(() => workflowTasks.id, {
      onDelete: "restrict",
    }),
    reason: text("reason"),
    before: jsonb("before").$type<Record<string, unknown> | null>(),
    after: jsonb("after").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("app_workflow_audit_idempotency_unique").on(
      table.idempotencyKey,
    ),
    index("app_workflow_audit_target_idx").on(
      table.targetType,
      table.targetId,
      table.createdAt,
    ),
    index("app_workflow_audit_runtime_path_idx").on(
      table.workflowInstanceId,
      table.runtimeSequence,
    ),
  ],
);
