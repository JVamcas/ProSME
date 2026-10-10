import {
  bigint,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "@/db/schema/identity";
import { chatbotKnowledgeReleases } from "./chatbot-knowledge.schema";
import type { VerifiedChatbotArtifacts } from "../domain/ChatbotReleaseArtifacts";

export const chatbotReleaseArtifacts = pgTable(
  "app_chatbot_release_artifacts",
  {
    releaseId: uuid("release_id")
      .primaryKey()
      .references(() => chatbotKnowledgeReleases.id),
    verified: jsonb("verified").$type<VerifiedChatbotArtifacts>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);
export const chatbotReleaseRevocations = pgTable(
  "app_chatbot_release_revocations",
  {
    releaseId: uuid("release_id")
      .primaryKey()
      .references(() => chatbotKnowledgeReleases.id),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);
export const chatbotSourceJobs = pgTable("app_chatbot_source_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  epoch: bigint("epoch", { mode: "bigint" }).notNull().unique(),
  releaseId: uuid("release_id")
    .notNull()
    .references(() => chatbotKnowledgeReleases.id),
  sourceTable: text("source_table").notNull(),
  candidateId: uuid("candidate_id").references(
    () => chatbotKnowledgeReleases.id,
  ),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
