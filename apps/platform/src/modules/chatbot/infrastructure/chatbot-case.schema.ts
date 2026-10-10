import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "@/db/schema/identity";
import { chatbotKnowledgeReleases } from "./chatbot-knowledge.schema";
import type {
  ConversationMessage,
  UnresolvedReason,
} from "../domain/ChatbotAnswer";
import type { ChatbotPolicy } from "../api/ChatbotKnowledgeSchemas";

export const chatbotCases = pgTable("app_chatbot_cases", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseNumber: integer("case_number")
    .generatedAlwaysAsIdentity()
    .notNull()
    .unique(),
  conversationId: uuid("conversation_id").notNull(),
  lastTurnId: uuid("last_turn_id").notNull(),
  state: text("state")
    .$type<"NEW" | "IN_PROGRESS" | "RESOLVED">()
    .notNull()
    .default("NEW"),
  assignedTo: uuid("assigned_to").references(() => users.id),
  question: text("question").notNull(),
  history: jsonb("history").$type<ConversationMessage[]>().notNull(),
  reason: text("reason").$type<UnresolvedReason>().notNull(),
  releaseId: uuid("release_id").references(() => chatbotKnowledgeReleases.id),
  sourceIds: jsonb("source_ids").$type<string[]>().notNull(),
  resolutionNote: text("resolution_note"),
  contact: jsonb("contact").$type<{
    name: string;
    email: string;
    consent: true;
  }>(),
  contactExpiresAt: timestamp("contact_expires_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  rowVersion: integer("row_version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const chatbotCaseAudit = pgTable("app_chatbot_case_audit", {
  id: uuid("id").primaryKey().defaultRandom(),
  caseId: uuid("case_id"),
  actorId: uuid("actor_id").references(() => users.id),
  action: text("action").notNull(),
  turnId: uuid("turn_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const chatbotOperationalPolicy = pgTable(
  "app_chatbot_operational_policy",
  {
    key: text("key").primaryKey(),
    policy: jsonb("policy").$type<ChatbotPolicy>().notNull(),
    updatedBy: uuid("updated_by")
      .notNull()
      .references(() => users.id),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);
export const chatbotPolicyAudit = pgTable("app_chatbot_policy_audit", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id")
    .notNull()
    .references(() => users.id),
  policy: jsonb("policy").$type<ChatbotPolicy>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
