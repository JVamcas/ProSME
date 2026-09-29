import { sql } from "drizzle-orm";
import {
  check,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "@/db/schema/identity";
import type {
  FundingCallCreationProgressValues,
  FundingCallCreationStep,
} from "../api/FundingCallSchemas";

export const fundingCallCreationProgress = pgTable(
  "app_funding_call_creation_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    currentStep: text("current_step")
      .$type<FundingCallCreationStep>()
      .notNull()
      .default("basics"),
    values: jsonb("values").$type<FundingCallCreationProgressValues>().notNull(),
    rowVersion: integer("row_version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("app_funding_call_creation_progress_owner_unique").on(
      table.ownerId,
    ),
    check(
      "app_funding_call_creation_progress_step_check",
      sql`${table.currentStep} in (
        'basics',
        'funding',
        'schedule',
        'application',
        'eligibility',
        'workflow',
        'publicContent',
        'review'
      )`,
    ),
    check(
      "app_funding_call_creation_progress_row_version_check",
      sql`${table.rowVersion} > 0`,
    ),
  ],
);
