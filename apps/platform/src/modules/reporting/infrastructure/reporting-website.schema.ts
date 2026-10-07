import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  date,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const websiteAnalyticsQueries = pgTable(
  "app_reporting_website_queries",
  {
    queryKey: text("query_key").primaryKey(),
    propertyId: text("property_id").notNull(),
    timezone: text("timezone").notNull(),
    collectionStart: date("collection_start").notNull(),
    contractVersion: text("contract_version").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    fundingCallId: uuid("funding_call_id"),
    includePanels: boolean("include_panels").notNull().default(false),
    lastRequestedAt: timestamp("last_requested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    nextDueAt: timestamp("next_due_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    leaseToken: uuid("lease_token"),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    failures: jsonb("failures").notNull().default({}),
  },
  (table) => [
    index("app_reporting_website_due_idx").on(table.nextDueAt),
    check(
      "app_reporting_website_period_check",
      sql`${table.startDate} <= ${table.endDate}`,
    ),
  ],
);

export const websiteAnalyticsSourceSnapshots = pgTable(
  "app_reporting_website_source_snapshots",
  {
    queryKey: text("query_key")
      .notNull()
      .references(() => websiteAnalyticsQueries.queryKey, {
        onDelete: "cascade",
      }),
    sourceName: text("source_name").notNull(),
    state: text("state").notNull(),
    data: jsonb("data").notNull(),
    metadata: jsonb("metadata"),
    note: text("note"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.queryKey, table.sourceName] }),
    check(
      "app_reporting_website_source_state_check",
      sql`${table.state} IN ('ready', 'no-data', 'unavailable')`,
    ),
    check(
      "app_reporting_website_source_name_check",
      sql`${table.sourceName} IN ('traffic', 'applicationReach', 'starterCompletion', 'applicationFunnel', 'dailyTraffic', 'mostViewedPages', 'geography', 'fundingCallEngagement', 'selfCheckJourney')`,
    ),
  ],
);
