import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "@/db/schema/identity";
import { workflowTasks } from "./workflow-runtime.schema";

export const workflowTaskCoi = pgTable("app_workflow_task_coi", {
  taskId: uuid("task_id").primaryKey()
    .references(() => workflowTasks.id, { onDelete: "restrict" }),
  userId: uuid("user_id").notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  state: text("state").$type<
    "CLEARED_NO_CONFLICT" | "PENDING_REVIEW" | "CLEARED_AFTER_REVIEW"
    | "RECUSED" | "REVOKED"
  >().notNull(),
  rowVersion: integer("row_version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workflowTaskCoiEvents = pgTable(
  "app_workflow_task_coi_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskId: uuid("task_id").notNull()
      .references(() => workflowTasks.id, { onDelete: "restrict" }),
    subjectUserId: uuid("subject_user_id").notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    actorId: uuid("actor_id").notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    fromState: text("from_state"),
    toState: text("to_state").notNull(),
    disclosureText: text("disclosure_text"),
    reason: text("reason"),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull().defaultNow(),
  },
  (table) => [
    index("app_workflow_task_coi_events_task_idx").on(
      table.taskId,
      table.occurredAt,
    ),
  ],
);

