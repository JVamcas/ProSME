import { check, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { users } from "@/db/schema/identity";

export const userSessions = pgTable(
  "app_user_sessions",
  {
    sessionHash: text("session_hash").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    firebaseSubject: text("firebase_subject").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    absoluteExpiresAt: timestamp("absolute_expires_at", {
      withTimezone: true,
    }).notNull(),
  },
  (table) => [
    index("app_user_sessions_expiry_idx").on(table.expiresAt),
    check(
      "app_user_sessions_expiry_check",
      sql`${table.expiresAt} <= ${table.absoluteExpiresAt}`,
    ),
  ],
);
