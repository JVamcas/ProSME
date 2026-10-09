import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { roles } from "@/db/schema/authorization";
import { users } from "@/db/schema/identity";
import { reportingReports } from "@/modules/reporting/infrastructure/reporting-definitions.schema";
import {
  notificationChannels,
  notificationEvents,
} from "./notification.schema";

export const notificationEventRules = pgTable(
  "app_notification_event_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => notificationEvents.id, { onDelete: "restrict" }),
    reportId: uuid("report_id").references(() => reportingReports.id),
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
    uniqueIndex("app_notification_event_rules_event_unique")
      .on(table.eventId)
      .where(sql`${table.reportId} IS NULL`),
    uniqueIndex("app_notification_event_rules_report_unique")
      .on(table.eventId, table.reportId)
      .where(sql`${table.reportId} IS NOT NULL`),
  ],
);

export const notificationEventRuleRecipients = pgTable(
  "app_notification_event_rule_recipients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ruleId: uuid("rule_id")
      .notNull()
      .references(() => notificationEventRules.id, { onDelete: "cascade" }),
    recipientType: text("recipient_type").notNull(),
    recipientUserId: uuid("recipient_user_id").references(() => users.id, {
      onDelete: "restrict",
    }),
    recipientRoleId: uuid("recipient_role_id").references(() => roles.id, {
      onDelete: "restrict",
    }),
    isRequired: boolean("is_required").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("app_notification_event_rule_recipients_dynamic_unique")
      .on(table.ruleId, table.recipientType)
      .where(
        sql`${table.recipientType} in ('APPLICATION_OWNER', 'ASSIGNED_USER', 'FUNDING_CALL_STAKEHOLDER', 'ACTION_ACTOR')`,
      ),
    uniqueIndex("app_notification_event_rule_recipients_user_unique")
      .on(table.ruleId, table.recipientType, table.recipientUserId)
      .where(sql`${table.recipientType} = 'SPECIFIC_USER'`),
    uniqueIndex("app_notification_event_rule_recipients_role_unique")
      .on(table.ruleId, table.recipientType, table.recipientRoleId)
      .where(sql`${table.recipientType} = 'SPECIFIC_ROLE'`),
    check(
      "app_notification_event_rule_recipients_target_check",
      sql`(${table.recipientType} in ('APPLICATION_OWNER', 'ASSIGNED_USER', 'FUNDING_CALL_STAKEHOLDER', 'ACTION_ACTOR')
          and ${table.recipientUserId} is null and ${table.recipientRoleId} is null)
        or (${table.recipientType} = 'SPECIFIC_USER'
          and ${table.recipientUserId} is not null and ${table.recipientRoleId} is null)
        or (${table.recipientType} = 'SPECIFIC_ROLE'
          and ${table.recipientUserId} is null and ${table.recipientRoleId} is not null)`,
    ),
    check(
      "app_notification_event_rule_recipients_type_check",
      sql`${table.recipientType} in ('APPLICATION_OWNER', 'ASSIGNED_USER', 'FUNDING_CALL_STAKEHOLDER', 'ACTION_ACTOR', 'SPECIFIC_USER', 'SPECIFIC_ROLE')`,
    ),
  ],
);

export const notificationEventRuleChannels = pgTable(
  "app_notification_event_rule_channels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ruleRecipientId: uuid("rule_recipient_id")
      .notNull()
      .references(() => notificationEventRuleRecipients.id, {
        onDelete: "cascade",
      }),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => notificationChannels.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("app_notification_event_rule_channels_target_unique").on(
      table.ruleRecipientId,
      table.channelId,
    ),
  ],
);
