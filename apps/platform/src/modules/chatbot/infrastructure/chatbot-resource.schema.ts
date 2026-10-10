import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "@/db/schema/identity";

export const chatbotResources = pgTable("app_chatbot_resources", {
  resourceKey: text("resource_key").primaryKey(),
  active: boolean("active").notNull().default(false),
  updatedBy: uuid("updated_by")
    .notNull()
    .references(() => users.id),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const chatbotResourceAudit = pgTable("app_chatbot_resource_audit", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorId: uuid("actor_id")
    .notNull()
    .references(() => users.id),
  resourceKeys: jsonb("resource_keys").$type<string[]>().notNull(),
  beforeState: jsonb("before_state")
    .$type<{ key: string; active: boolean }[]>()
    .notNull(),
  active: boolean("active").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
