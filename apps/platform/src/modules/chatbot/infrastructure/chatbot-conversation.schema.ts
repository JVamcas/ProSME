import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import type { ConversationMessage } from "../domain/ChatbotAnswer";
import type { ChatbotTurnResponse } from "../domain/ChatbotConversation";

export const chatbotConversations = pgTable(
  "app_chatbot_conversations",
  {
    id: uuid("id").primaryKey(),
    credentialHash: text("credential_hash").notNull(),
    noticeVersion: text("notice_version").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    history: jsonb("history")
      .$type<ConversationMessage[]>()
      .notNull()
      .default([]),
    callId: uuid("call_id"),
    completedTurns: integer("completed_turns").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("app_chatbot_conversations_expiry").on(table.expiresAt)],
);
export const chatbotTurns = pgTable(
  "app_chatbot_turns",
  {
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => chatbotConversations.id, { onDelete: "cascade" }),
    id: uuid("id").notNull(),
    inputHash: text("input_hash").notNull(),
    claimId: uuid("claim_id").notNull(),
    claimUntil: timestamp("claim_until", { withTimezone: true }).notNull(),
    response: jsonb("response").$type<ChatbotTurnResponse>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.conversationId, table.id] })],
);
export const chatbotRateLimits = pgTable("app_chatbot_rate_limits", {
  keyHash: text("key_hash").primaryKey(),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  requestCount: integer("request_count").notNull().default(1),
});
