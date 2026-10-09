import { sql } from "drizzle-orm";
import {
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "@/db/schema/identity";
import { applications } from "./application.schema";

export const applicationCommands = pgTable(
  "app_application_commands",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "restrict" }),
    commandType: text("command_type")
      .$type<"CREATE_DRAFT" | "SAVE_DRAFT_RESPONSE">()
      .notNull(),
    idempotencyKey: uuid("idempotency_key").notNull(),
    requestFingerprint: text("request_fingerprint").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("app_application_commands_actor_key_unique").on(
      table.actorUserId,
      table.idempotencyKey,
    ),
    index("app_application_commands_application_idx").on(
      table.applicationId,
      table.createdAt,
    ),
    check(
      "app_application_commands_type_check",
      sql`${table.commandType} in ('CREATE_DRAFT', 'SAVE_DRAFT_RESPONSE')`,
    ),
  ],
);

export const applicationAuditEntries = pgTable(
  "app_application_audit_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applications.id, { onDelete: "restrict" }),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    action: text("action")
      .$type<
        | "APPLICATION_DRAFT_CREATED"
        | "APPLICATION_DRAFT_SAVED"
        | "APPLICATION_DRAFT_DELETED"
        | "APPLICATION_SUBMITTED"
        | "APPLICATION_REFERENCE_ALLOCATED"
        | "APPLICATION_SNAPSHOT_CREATED"
        | "APPLICATION_WORKFLOW_BOOTSTRAPPED"
        | "APPLICATION_WITHDRAWN"
        | "SUBMISSION_SNAPSHOT_ACCESSED"
      >()
      .notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    correlationId: uuid("correlation_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("app_application_audit_entries_application_idx").on(
      table.applicationId,
      table.createdAt,
      table.id,
    ),
    check(
      "app_application_audit_entries_action_check",
      sql`${table.action} in (
        'APPLICATION_DRAFT_CREATED',
        'APPLICATION_DRAFT_SAVED',
        'APPLICATION_DRAFT_DELETED',
        'APPLICATION_SUBMITTED',
        'APPLICATION_REFERENCE_ALLOCATED',
        'APPLICATION_SNAPSHOT_CREATED',
        'APPLICATION_WORKFLOW_BOOTSTRAPPED',
        'APPLICATION_WITHDRAWN',
        'SUBMISSION_SNAPSHOT_ACCESSED'
      )`,
    ),
  ],
);
