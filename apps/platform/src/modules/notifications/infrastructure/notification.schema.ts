import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "@/db/schema/identity";
import type { NotificationEventContextByKey } from "../domain/NotificationEvent";

export const notificationChannels = pgTable(
  "app_notification_channels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    displayName: text("display_name").notNull(),
    channelType: text("channel_type").$type<"EMAIL">().notNull(),
    sortOrder: integer("sort_order").notNull().default(10),
    isEnabled: boolean("is_enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("app_notification_channels_code_unique").on(table.code),
    check(
      "app_notification_channels_type_check",
      sql`${table.channelType} = 'EMAIL'`,
    ),
  ],
);

export const notificationCatalogs = pgTable(
  "app_notification_catalogs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    catalogKey: text("catalog_key").notNull(),
    displayName: text("display_name").notNull(),
    description: text("description").notNull(),
    sortOrder: integer("sort_order").notNull().default(10),
    isEnabled: boolean("is_enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("app_notification_catalogs_key_unique").on(table.catalogKey),
  ],
);

export const notificationEvents = pgTable(
  "app_notification_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    catalogId: uuid("catalog_id")
      .notNull()
      .references(() => notificationCatalogs.id, { onDelete: "restrict" }),
    eventKey: text("event_key").notNull(),
    displayName: text("display_name").notNull(),
    description: text("description").notNull(),
    isEnabled: boolean("is_enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("app_notification_events_key_unique").on(table.eventKey),
  ],
);

export const notificationTemplateTargets = pgTable(
  "app_notification_template_targets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => notificationChannels.id, { onDelete: "restrict" }),
    scope: text("scope").$type<"GLOBAL" | "CATALOG" | "EVENT">().notNull(),
    catalogId: uuid("catalog_id").references(() => notificationCatalogs.id, {
      onDelete: "restrict",
    }),
    eventId: uuid("event_id").references(() => notificationEvents.id, {
      onDelete: "restrict",
    }),
    defaultSubjectTemplate: text("default_subject_template")
      .notNull()
      .default("Notification from {{platformName}}"),
    isEnabled: boolean("is_enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("app_notification_template_targets_global_unique")
      .on(table.channelId)
      .where(sql`${table.scope} = 'GLOBAL'`),
    uniqueIndex("app_notification_template_targets_catalog_unique")
      .on(table.channelId, table.catalogId)
      .where(sql`${table.scope} = 'CATALOG'`),
    uniqueIndex("app_notification_template_targets_event_unique")
      .on(table.channelId, table.eventId)
      .where(sql`${table.scope} = 'EVENT'`),
    check(
      "app_notification_template_targets_subject_check",
      sql`char_length(trim(${table.defaultSubjectTemplate})) between 1 and 500
        and ${table.defaultSubjectTemplate} !~ E'[\\r\\n]'`,
    ),
    check(
      "app_notification_template_targets_scope_check",
      sql`(${table.scope} = 'GLOBAL' and ${table.catalogId} is null and ${table.eventId} is null)
        or (${table.scope} = 'CATALOG' and ${table.catalogId} is not null and ${table.eventId} is null)
        or (${table.scope} = 'EVENT' and ${table.catalogId} is null and ${table.eventId} is not null)`,
    ),
  ],
);

export const notificationTemplateVersions = pgTable(
  "app_notification_template_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    templateTargetId: uuid("template_target_id")
      .notNull()
      .references(() => notificationTemplateTargets.id, {
        onDelete: "restrict",
      }),
    versionNumber: integer("version_number").notNull(),
    sourceFileName: text("source_file_name").notNull(),
    mediaType: text("media_type").notNull(),
    subjectTemplate: text("subject_template").notNull(),
    htmlTemplate: text("html_template").notNull(),
    plainTextTemplate: text("plain_text_template").notNull(),
    contentSha256: text("content_sha256").notNull(),
    status: text("status")
      .$type<"DRAFT" | "PUBLISHED" | "RETIRED">()
      .notNull()
      .default("DRAFT"),
    uploadedByUserId: uuid("uploaded_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    publishedByUserId: uuid("published_by_user_id").references(() => users.id, {
      onDelete: "restrict",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("app_notification_template_versions_number_unique").on(
      table.templateTargetId,
      table.versionNumber,
    ),
    uniqueIndex("app_notification_template_versions_published_unique")
      .on(table.templateTargetId)
      .where(sql`${table.status} = 'PUBLISHED'`),
    check(
      "app_notification_template_versions_number_check",
      sql`${table.versionNumber} > 0`,
    ),
    check(
      "app_notification_template_versions_media_type_check",
      sql`${table.mediaType} = 'text/html'`,
    ),
    check(
      "app_notification_template_versions_status_check",
      sql`${table.status} in ('DRAFT', 'PUBLISHED', 'RETIRED')`,
    ),
    check(
      "app_notification_template_versions_digest_check",
      sql`${table.contentSha256} ~ '^[0-9a-f]{64}$'`,
    ),
  ],
);

export const notificationOutbox = pgTable(
  "app_notification_outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => notificationEvents.id, { onDelete: "restrict" }),
    eventKey: text("event_key").notNull(),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: uuid("aggregate_id").notNull(),
    occurrenceKey: text("occurrence_key").notNull(),
    correlationId: text("correlation_id").notNull(),
    context: jsonb("context")
      .$type<
        NotificationEventContextByKey[keyof NotificationEventContextByKey]
      >()
      .notNull(),
    status: text("status")
      .$type<"PENDING" | "PROCESSING" | "PARTIALLY_SENT" | "SENT" | "FAILED">()
      .notNull()
      .default("PENDING"),
    availableAt: timestamp("available_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastErrorCode: text("last_error_code"),
    lastErrorMessage: text("last_error_message"),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: text("locked_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("app_notification_outbox_occurrence_unique").on(
      table.eventKey,
      table.occurrenceKey,
    ),
    index("app_notification_outbox_due_idx").on(
      table.status,
      table.availableAt,
      table.id,
    ),
    index("app_notification_outbox_stale_lock_idx").on(
      table.status,
      table.lockedAt,
      table.id,
    ),
    index("app_notification_outbox_event_history_idx").on(
      table.eventId,
      table.createdAt,
      table.id,
    ),
    check(
      "app_notification_outbox_status_check",
      sql`${table.status} in ('PENDING', 'PROCESSING', 'PARTIALLY_SENT', 'SENT', 'FAILED')`,
    ),
    check(
      "app_notification_outbox_attempt_count_check",
      sql`${table.attemptCount} >= 0`,
    ),
  ],
);

export const notificationDeliveries = pgTable(
  "app_notification_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    outboxId: uuid("outbox_id")
      .notNull()
      .references(() => notificationOutbox.id, { onDelete: "restrict" }),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => notificationChannels.id, { onDelete: "restrict" }),
    templateVersionId: uuid("template_version_id").references(
      () => notificationTemplateVersions.id,
      { onDelete: "restrict" },
    ),
    recipientUserId: uuid("recipient_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    recipientName: text("recipient_name").notNull(),
    recipientEmail: text("recipient_email").notNull(),
    recipientType: text("recipient_type").notNull(),
    resolutionPath: text("resolution_path").notNull(),
    status: text("status")
      .$type<"PENDING" | "PROCESSING" | "SENT" | "FAILED">()
      .notNull()
      .default("PENDING"),
    attemptCount: integer("attempt_count").notNull().default(0),
    providerMessageId: text("provider_message_id"),
    lastErrorCode: text("last_error_code"),
    lastErrorMessage: text("last_error_message"),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("app_notification_deliveries_recipient_unique").on(
      table.outboxId,
      table.channelId,
      sql`lower(${table.recipientEmail})`,
    ),
    index("app_notification_deliveries_due_idx").on(
      table.status,
      table.nextAttemptAt,
      table.id,
    ),
    index("app_notification_deliveries_history_idx").on(
      table.createdAt,
      table.id,
    ),
    index("app_notification_deliveries_status_history_idx").on(
      table.status,
      table.createdAt,
      table.id,
    ),
    index("app_notification_deliveries_recipient_email_idx").on(
      sql`lower(${table.recipientEmail})`,
    ),
    check(
      "app_notification_deliveries_recipient_check",
      sql`${table.recipientType} in ('APPLICATION_OWNER', 'ASSIGNED_USER', 'FUNDING_CALL_STAKEHOLDER', 'SPECIFIC_USER', 'SPECIFIC_ROLE')`,
    ),
    check(
      "app_notification_deliveries_status_check",
      sql`${table.status} in ('PENDING', 'PROCESSING', 'SENT', 'FAILED')`,
    ),
    check(
      "app_notification_deliveries_attempt_count_check",
      sql`${table.attemptCount} >= 0`,
    ),
  ],
);
