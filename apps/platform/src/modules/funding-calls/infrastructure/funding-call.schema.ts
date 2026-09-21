import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "@/db/schema/identity";
import type { FundingCallStatus } from "../domain/FundingCall";

export const fundingCalls = pgTable(
  "app_funding_calls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reference: text("reference").notNull(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    fundingInstrument: text("funding_instrument"),
    thematicArea: text("thematic_area"),
    totalBudgetEnvelope: numeric("total_budget_envelope", {
      precision: 18,
      scale: 2,
    }).notNull(),
    minimumGrantAmount: numeric("minimum_grant_amount", {
      precision: 18,
      scale: 2,
    }).notNull(),
    maximumGrantAmount: numeric("maximum_grant_amount", {
      precision: 18,
      scale: 2,
    }).notNull(),
    opensAt: timestamp("opens_at", { withTimezone: true }).notNull(),
    closesAt: timestamp("closes_at", { withTimezone: true }).notNull(),
    status: text("status").$type<FundingCallStatus>().notNull().default("DRAFT"),
    publicContactName: text("public_contact_name"),
    publicContactEmail: text("public_contact_email"),
    publicContactPhone: text("public_contact_phone"),
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
  },
  (table) => [
    uniqueIndex("app_funding_calls_reference_unique").on(table.reference),
    uniqueIndex("app_funding_calls_slug_unique").on(table.slug),
    index("app_funding_calls_status_dates_idx").on(
      table.status,
      table.opensAt,
      table.closesAt,
    ),
    check(
      "app_funding_calls_status_check",
      sql`${table.status} in ('DRAFT', 'SCHEDULED', 'OPEN', 'CLOSED', 'CANCELLED')`,
    ),
    check(
      "app_funding_calls_budget_check",
      sql`${table.totalBudgetEnvelope} >= 0
        and ${table.minimumGrantAmount} >= 0
        and ${table.maximumGrantAmount} >= ${table.minimumGrantAmount}
        and ${table.totalBudgetEnvelope} >= ${table.maximumGrantAmount}`,
    ),
    check(
      "app_funding_calls_dates_check",
      sql`${table.closesAt} > ${table.opensAt}`,
    ),
    check(
      "app_funding_calls_row_version_check",
      sql`${table.rowVersion} > 0`,
    ),
  ],
);
