import { check, jsonb, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import type { ConditionGroup } from "../domain/ConditionGroup";

export const conditionGroups = pgTable(
  "app_condition_groups",
  {
    id: uuid("id").primaryKey(),
    definition: jsonb("definition").$type<ConditionGroup>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "app_condition_groups_definition_check",
      sql`(jsonb_typeof(${table.definition}) = 'object'
        and ${table.definition}->>'kind' = 'GROUP'
        and ${table.definition}->>'id' = ${table.id}::text) is true`,
    ),
  ],
);
