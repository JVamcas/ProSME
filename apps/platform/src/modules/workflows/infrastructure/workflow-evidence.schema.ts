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

import { applications } from "@/db/schema/applications";
import { users } from "@/db/schema/identity";
import { workflowStageDocumentRequirements } from "./workflow-stage-requirements.schema";

export const workflowDocumentEvidenceVersions = pgTable(
  "app_workflow_document_evidence_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "restrict" }),
    requirementId: uuid("requirement_id")
      .notNull()
      .references(() => workflowStageDocumentRequirements.id, {
        onDelete: "restrict",
      }),
    versionNumber: integer("version_number").notNull(),
    objectKey: text("object_key").notNull(),
    originalName: text("original_name").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("app_workflow_document_evidence_version_unique").on(
      table.applicationId,
      table.requirementId,
      table.versionNumber,
    ),
    uniqueIndex("app_workflow_document_evidence_object_unique").on(
      table.objectKey,
    ),
    index("app_workflow_document_evidence_lookup_idx").on(
      table.applicationId,
      table.requirementId,
      table.versionNumber,
    ),
    check(
      "app_workflow_document_evidence_version_check",
      sql`${table.versionNumber} > 0`,
    ),
    check(
      "app_workflow_document_evidence_size_check",
      sql`${table.sizeBytes} > 0`,
    ),
  ],
);

export const workflowDocumentEvidenceVerifications = pgTable(
  "app_workflow_document_evidence_verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentVersionId: uuid("document_version_id")
      .notNull()
      .references(() => workflowDocumentEvidenceVersions.id, {
        onDelete: "restrict",
      }),
    status: text("status").$type<"REJECTED" | "VERIFIED">().notNull(),
    reviewedBy: uuid("reviewed_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    comment: text("comment").notNull().default(""),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("app_workflow_document_evidence_verification_unique").on(
      table.documentVersionId,
    ),
    check(
      "app_workflow_document_evidence_verification_status_check",
      sql`${table.status} in ('VERIFIED', 'REJECTED')`,
    ),
  ],
);
