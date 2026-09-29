import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { fundingCalls } from "./funding-call.schema";

export const fundingCallPublicDocuments = pgTable(
  "app_funding_call_public_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fundingCallId: uuid("funding_call_id")
      .notNull()
      .references(() => fundingCalls.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    url: text("url").notNull(),
    displayOrder: integer("display_order").notNull().default(0),
    finalized: boolean("finalized").notNull().default(false),
    markedForPublication: boolean("marked_for_publication")
      .notNull()
      .default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    securityCleared: boolean("security_cleared").notNull().default(false),
  },
  (table) => [
    index("app_funding_call_public_documents_call_idx").on(
      table.fundingCallId,
      table.displayOrder,
    ),
    check(
      "app_funding_call_public_documents_display_order_check",
      sql`${table.displayOrder} >= 0`,
    ),
    check(
      "app_funding_call_public_documents_url_check",
      sql`${table.url} ~ '^(https?://|/)'`,
    ),
  ],
);
