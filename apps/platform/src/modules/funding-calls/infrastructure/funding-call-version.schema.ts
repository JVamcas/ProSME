import { sql } from "drizzle-orm";
import {
  check,
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { users } from "@/db/schema/identity";
import type { FundingCallPublicationSnapshot } from "../domain/FundingCallPublication";
import { jsonb } from "drizzle-orm/pg-core";
import { fundingCalls } from "./funding-call.schema";

// Published versions live in the immutable publication revisions table. A working
// version keeps the same ID when published and never changes the effective call.
export const fundingCallDraftVersions = pgTable(
  "app_funding_call_draft_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fundingCallId: uuid("funding_call_id")
      .notNull()
      .references(() => fundingCalls.id, { onDelete: "restrict" }),
    status: text("status")
      .$type<"DRAFT" | "APPROVAL_PENDING" | "APPROVED">()
      .notNull()
      .default("DRAFT"),
    snapshot: jsonb("snapshot")
      .$type<FundingCallPublicationSnapshot>()
      .notNull(),
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
    uniqueIndex("app_funding_call_one_working_version").on(table.fundingCallId),
    check(
      "app_funding_call_draft_version_status_check",
      sql`${table.status} in ('DRAFT', 'APPROVAL_PENDING', 'APPROVED')`,
    ),
  ],
);
