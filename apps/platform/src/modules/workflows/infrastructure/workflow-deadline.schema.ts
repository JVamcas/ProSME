import { index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import type { WorkflowDeadlineKind } from "../domain/runtime/WorkflowDeadline";
import { workflowInstances } from "./workflow-runtime.schema";

export const workflowDeadlineExecutions = pgTable(
  "app_workflow_deadline_executions",
  {
    occurrenceKey: text("occurrence_key").primaryKey(),
    workflowInstanceId: uuid("workflow_instance_id").notNull()
      .references(() => workflowInstances.id, { onDelete: "restrict" }),
    kind: text("kind").$type<WorkflowDeadlineKind>().notNull(),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    retryAt: timestamp("retry_at", { withTimezone: true }),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastErrorCode: text("last_error_code"),
  },
  (table) => [index("app_workflow_deadline_retry_idx").on(table.retryAt)],
);
