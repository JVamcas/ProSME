import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const authEmailRateLimits = pgTable(
  "app_auth_email_rate_limits",
  {
    keyHash: text("key_hash").primaryKey(),
    windowStartedAt: timestamp("window_started_at", {
      withTimezone: true,
    }).notNull(),
    requestCount: integer("request_count").notNull(),
  },
  (table) => [
    index("app_auth_email_rate_limits_window_idx").on(table.windowStartedAt),
  ],
);
