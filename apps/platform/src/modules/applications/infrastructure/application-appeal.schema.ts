import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  integer,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
  check,
} from "drizzle-orm/pg-core";
import { users } from "@/db/schema/identity";
import { applications } from "./application.schema";
export const applicationAppeals = pgTable(
  "app_application_appeals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    appealNumber: integer("appeal_number")
      .generatedAlwaysAsIdentity()
      .notNull()
      .unique(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull().default(""),
    grounds: text("grounds").notNull(),
    details: text("details").notNull(),
    consent: boolean("consent").notNull(),
    state: text("state").notNull().default("NEW"),
    assignedTo: uuid("assigned_to").references(() => users.id),
    resolutionNote: text("resolution_note"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    rowVersion: integer("row_version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("app_application_appeals_queue").on(
      table.updatedAt.desc(),
      table.id.desc(),
    ),
    index("app_application_appeals_application").on(table.applicationId),
    check(
      "app_application_appeals_state",
      sql`${table.state} IN ('NEW', 'IN_PROGRESS', 'RESOLVED')`,
    ),
    check("app_application_appeals_consent", sql`${table.consent} = true`),
    check(
      "app_application_appeals_resolution",
      sql`${table.state} <> 'RESOLVED' OR (${table.resolutionNote} IS NOT NULL AND length(trim(${table.resolutionNote})) > 0 AND ${table.resolvedAt} IS NOT NULL)`,
    ),
  ],
);
export const applicationAppealAudit = pgTable("app_application_appeal_audit", {
  id: uuid("id").primaryKey().defaultRandom(),
  appealId: uuid("appeal_id")
    .notNull()
    .references(() => applicationAppeals.id),
  actorId: uuid("actor_id").references(() => users.id),
  action: text("action").notNull(),
  changes: jsonb("changes").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
