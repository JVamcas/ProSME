import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "@/db/schema/identity";
import { applications } from "./application.schema";

export const applicationDocumentVersions = pgTable(
  "app_application_document_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    requirementKey: text("requirement_key").notNull(),
    versionNumber: integer("version_number").notNull(),
    objectKey: text("object_key").notNull(),
    originalName: text("original_name").notNull(),
    contentType: text("content_type").notNull(),
    extension: text("extension").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    checksumSha256: text("checksum_sha256").notNull(),
    storageStatus: text("storage_status")
      .$type<"pending" | "finalized" | "failed" | "abandoned">()
      .notNull()
      .default("pending"),
    failureCode: text("failure_code"),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finalizedAt: timestamp("finalized_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("app_document_version_number_unique").on(
      table.applicationId,
      table.requirementKey,
      table.versionNumber,
    ),
    uniqueIndex("app_document_version_object_key_unique").on(table.objectKey),
    index("app_document_version_owner_application_idx").on(
      table.ownerUserId,
      table.applicationId,
    ),
    index("app_document_version_cleanup_idx").on(
      table.storageStatus,
      table.uploadedAt,
    ),
    check(
      "app_document_version_requirement_key_check",
      sql`${table.requirementKey} ~ '^[A-Z][A-Z0-9_]{1,79}$'`,
    ),
    check(
      "app_document_version_number_check",
      sql`${table.versionNumber} > 0`,
    ),
    check(
      "app_document_version_size_check",
      sql`${table.sizeBytes} > 0 and ${table.sizeBytes} <= 10485760`,
    ),
    check(
      "app_document_version_checksum_check",
      sql`${table.checksumSha256} ~ '^[a-f0-9]{64}$'`,
    ),
    check(
      "app_document_version_storage_status_check",
      sql`${table.storageStatus} in ('pending', 'finalized', 'failed', 'abandoned')`,
    ),
    check(
      "app_document_version_finalization_check",
      sql`(${table.storageStatus} = 'finalized' and ${table.finalizedAt} is not null)
        or (${table.storageStatus} <> 'finalized')`,
    ),
  ],
);

export type ApplicationDocumentVersionRecord =
  typeof applicationDocumentVersions.$inferSelect;
