import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userTypeEnum = pgEnum("app_user_type", ["applicant", "staff"]);
export const userStatusEnum = pgEnum("app_user_status", ["invited", "active", "suspended", "disabled"]);

export const users = pgTable(
  "app_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    userType: userTypeEnum("user_type").notNull().default("applicant"),
    status: userStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  },
  (table) => [uniqueIndex("app_users_email_unique").on(table.email)],
);

export const userIdentities = pgTable(
  "app_user_identities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("firebase"),
    subject: text("subject").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("app_user_identities_provider_subject_unique").on(table.provider, table.subject),
    index("app_user_identities_user_idx").on(table.userId),
  ],
);

export type ApplicationUser = typeof users.$inferSelect;
export type NewApplicationUser = typeof users.$inferInsert;
