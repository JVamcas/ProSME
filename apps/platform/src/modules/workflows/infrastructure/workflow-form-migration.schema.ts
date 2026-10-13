import { jsonb, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { workflowDefinitionVersions } from "./workflow.schema";

export const workflowFormMigrations = pgTable("app_workflow_form_migrations", {
  sourceVersionId: uuid("source_version_id")
    .primaryKey()
    .references(() => workflowDefinitionVersions.id),
  targetVersionId: uuid("target_version_id")
    .notNull()
    .unique()
    .references(() => workflowDefinitionVersions.id),
  mapping: jsonb("mapping").notNull(),
  migratedAt: timestamp("migrated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
