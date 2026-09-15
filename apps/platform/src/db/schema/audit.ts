import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const authorizationAuditEntries = pgTable("app_authorization_audit_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: text("actor_id").notNull(),
  targetUserId: uuid("target_user_id"),
  targetRoleId: uuid("target_role_id"),
  action: text("action").notNull(),
  roleCode: text("role_code"),
  changes: jsonb("changes").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
