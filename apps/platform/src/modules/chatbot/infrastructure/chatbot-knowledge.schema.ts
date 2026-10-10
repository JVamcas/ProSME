import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  foreignKey,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "@/db/schema/identity";
import type { PreparedKnowledge } from "../domain/ChatbotKnowledge";

export const chatbotKnowledgeReleases = pgTable(
  "app_chatbot_knowledge_releases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    status: text("status")
      .$type<"PREPARED" | "APPROVED">()
      .notNull()
      .default("PREPARED"),
    contentHash: text("content_hash").notNull(),
    snapshot: jsonb("snapshot").$type<PreparedKnowledge>().notNull(),
    preparedBy: uuid("prepared_by")
      .notNull()
      .references(() => users.id),
    preparedAt: timestamp("prepared_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
  },
  (table) => [
    unique("app_chatbot_release_hash_unique").on(table.id, table.contentHash),
    check(
      "app_chatbot_release_hash_check",
      sql`${table.contentHash} ~ '^[a-f0-9]{64}$'`,
    ),
    check(
      "app_chatbot_release_status_check",
      sql`${table.status} IN ('PREPARED', 'APPROVED')`,
    ),
    check(
      "app_chatbot_release_snapshot_check",
      sql`jsonb_typeof(${table.snapshot}) = 'object' AND ${table.snapshot}->>'schemaVersion' = '1'`,
    ),
    check(
      "app_chatbot_release_approval_check",
      sql`(${table.status} = 'APPROVED') = (${table.approvedAt} IS NOT NULL)`,
    ),
    index("app_chatbot_release_prepared_idx").on(
      table.preparedAt.desc(),
      table.id.desc(),
    ),
  ],
);

export const chatbotKnowledgeApprovals = pgTable(
  "app_chatbot_knowledge_approvals",
  {
    releaseId: uuid("release_id").primaryKey(),
    contentHash: text("content_hash").notNull(),
    approvedBy: uuid("approved_by")
      .notNull()
      .references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "app_chatbot_approval_content_fk",
      columns: [table.releaseId, table.contentHash],
      foreignColumns: [
        chatbotKnowledgeReleases.id,
        chatbotKnowledgeReleases.contentHash,
      ],
    }),
  ],
);

export const chatbotKnowledgeState = pgTable(
  "app_chatbot_knowledge_state",
  {
    key: text("key").primaryKey(),
    epoch: bigint("epoch", { mode: "bigint" }).notNull().default(BigInt(0)),
    activeReleaseId: uuid("active_release_id").references(
      () => chatbotKnowledgeReleases.id,
    ),
  },
  (table) => [
    check("app_chatbot_state_key_check", sql`${table.key} = 'ACTIVE'`),
  ],
);

export const chatbotKnowledgeAudit = pgTable("app_chatbot_knowledge_audit", {
  id: uuid("id").primaryKey().defaultRandom(),
  releaseId: uuid("release_id")
    .notNull()
    .references(() => chatbotKnowledgeReleases.id),
  actorId: uuid("actor_id")
    .notNull()
    .references(() => users.id),
  action: text("action").notNull(),
  contentHash: text("content_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
