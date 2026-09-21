import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "@/db/schema/identity";
import { workflowTasks } from "@/modules/workflows/infrastructure/workflow-runtime.schema";
import { formVersions } from "./form.schema";
import type { FormRuntimeSchema } from "@/modules/forms/FormTypes";

export const formSubmissions = pgTable(
  "app_form_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taskInstanceId: uuid("task_instance_id")
      .notNull()
      .references(() => workflowTasks.id, { onDelete: "restrict" }),
    formVersionId: uuid("form_version_id")
      .notNull()
      .references(() => formVersions.id, { onDelete: "restrict" }),
    status: text("status")
      .$type<"DRAFT" | "COMPLETED">()
      .notNull()
      .default("DRAFT"),
    values: jsonb("values")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    definitionSnapshot: jsonb("definition_snapshot")
      .$type<FormRuntimeSchema | null>(),
    rowVersion: integer("row_version").notNull().default(1),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    updatedBy: uuid("updated_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("app_form_submissions_task_unique").on(table.taskInstanceId),
    index("app_form_submissions_version_idx").on(table.formVersionId),
    check(
      "app_form_submissions_status_check",
      sql`${table.status} in ('DRAFT', 'COMPLETED')`,
    ),
    check(
      "app_form_submissions_row_version_check",
      sql`${table.rowVersion} > 0`,
    ),
    check(
      "app_form_submissions_completion_snapshot_check",
      sql`(${table.status} = 'DRAFT' and ${table.completedAt} is null and ${table.definitionSnapshot} is null) or (${table.status} = 'COMPLETED' and ${table.completedAt} is not null and ${table.definitionSnapshot} is not null and jsonb_typeof(${table.definitionSnapshot}) = 'object' and ${table.definitionSnapshot}->>'versionId' = ${table.formVersionId}::text)`,
    ),
  ],
);
