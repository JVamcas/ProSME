import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "@/db/schema/identity";

export const chatbotDocuments = pgTable("app_chatbot_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  fileName: text("file_name").notNull(),
  objectKey: text("object_key").notNull().unique(),
  contentType: text("content_type").notNull(),
  fileBytes: integer("file_bytes").notNull(),
  extractedText: text("extracted_text").notNull(),
  contentHash: text("content_hash").notNull(),
  uploadedBy: uuid("uploaded_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const chatbotDocumentAudit = pgTable("app_chatbot_document_audit", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => chatbotDocuments.id),
  actorId: uuid("actor_id")
    .notNull()
    .references(() => users.id),
  action: text("action").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
