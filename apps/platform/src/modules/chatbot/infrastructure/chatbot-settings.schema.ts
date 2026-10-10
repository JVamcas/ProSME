import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "@/db/schema/identity";
import type { ChatbotRuntimeSettings } from "../domain/ChatbotSettings";

export const chatbotSettings = pgTable("app_chatbot_settings", {
  key: text("key").primaryKey(),
  publicEnabled: boolean("public_enabled").notNull().default(false),
  modelEnabled: boolean("model_enabled").notNull().default(false),
  rowVersion: integer("row_version").notNull().default(1),
  updatedBy: uuid("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const chatbotSettingsAudit = pgTable("app_chatbot_settings_audit", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id")
    .notNull()
    .references(() => users.id),
  beforeSettings: jsonb("before_settings")
    .$type<ChatbotRuntimeSettings>()
    .notNull(),
  afterSettings: jsonb("after_settings")
    .$type<ChatbotRuntimeSettings>()
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
