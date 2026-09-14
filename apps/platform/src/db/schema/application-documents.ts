import {
  bigint,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type { ApplicationDocumentType } from "@/modules/applications/ApplicationDocumentSchemas";
import { applications } from "./applications";
import { users } from "./identity";

export const applicationDocuments = pgTable(
  "app_application_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "cascade" }),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    documentType: text("document_type")
      .$type<ApplicationDocumentType>()
      .notNull(),
    objectKey: text("object_key").notNull(),
    originalName: text("original_name").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    scanStatus: text("scan_status")
      .$type<"pending" | "clean" | "rejected">()
      .notNull()
      .default("pending"),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("app_application_documents_type_unique").on(
      table.applicationId,
      table.documentType,
    ),
    uniqueIndex("app_application_documents_object_key_unique").on(
      table.objectKey,
    ),
    index("app_application_documents_owner_application_idx").on(
      table.ownerUserId,
      table.applicationId,
    ),
  ],
);

export type ApplicationDocumentRecord =
  typeof applicationDocuments.$inferSelect;
