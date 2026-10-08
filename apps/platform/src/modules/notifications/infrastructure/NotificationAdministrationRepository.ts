import "server-only";

import { sql } from "drizzle-orm";

import { getDatabase } from "@/platform/database/client";
import { authorizationAuditEntries } from "@/db/schema";
import type {
  NotificationCatalogUpdate,
  NotificationEventRuleListQuery,
  NotificationEventRuleUpdate,
} from "../api/NotificationAdministrationSchemas";
import type { NotificationChannelUpdate } from "../api/NotificationTemplateSchemas";
import type { NotificationAuditMetadata } from "../domain/NotificationAudit";

export async function updateNotificationChannelRecord(input: {
  actorId: string;
  channelCode: string;
  correlationId: string;
  update: NotificationChannelUpdate;
}) {
  return getDatabase().transaction(async (transaction) => {
    const updated = await transaction.execute(sql`
      UPDATE app_notification_channels
      SET sort_order = ${input.update.sortOrder},
        is_enabled = ${input.update.isEnabled},
        updated_at = now()
      WHERE code = ${input.channelCode}
        AND updated_at = ${input.update.expectedUpdatedAt}::timestamptz
      RETURNING code
    `);
    if (!updated.rows[0]) return undefined;
    await transaction.insert(authorizationAuditEntries).values({
      action: "NOTIFICATION_CHANNEL_UPDATED",
      actorId: input.actorId,
      changes: {
        channelCode: input.channelCode,
        correlationId: input.correlationId,
      } satisfies NotificationAuditMetadata,
    });
    return updated.rows[0];
  });
}

export async function listNotificationCatalogRecords() {
  const result = await getDatabase().execute(sql`
    SELECT catalog.catalog_key AS "catalogKey",
      catalog.display_name AS "displayName",
      catalog.description,
      catalog.sort_order AS "sortOrder",
      catalog.is_enabled AS "isEnabled",
      to_char(catalog.updated_at AT TIME ZONE 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.US') || 'Z' AS "updatedAt",
      count(event.id)::integer AS "eventCount",
      count(event.id) FILTER (WHERE event.rule_eligibility = 'CONFIGURABLE')::integer
        AS "configurableEventCount"
    FROM app_notification_catalogs catalog
    LEFT JOIN app_notification_events event ON event.catalog_id = catalog.id
    GROUP BY catalog.id
    ORDER BY catalog.sort_order, catalog.catalog_key
  `);
  return result.rows;
}

export async function findNotificationCatalogRecord(catalogKey: string) {
  const result = await getDatabase().execute(sql`
    SELECT catalog.catalog_key AS "catalogKey",
      catalog.display_name AS "displayName",
      catalog.description,
      catalog.sort_order AS "sortOrder",
      catalog.is_enabled AS "isEnabled",
      to_char(catalog.updated_at AT TIME ZONE 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.US') || 'Z' AS "updatedAt",
      COALESCE(json_agg(json_build_object(
        'eventKey', event.event_key,
        'ruleEligibility', event.rule_eligibility,
        'displayName', event.display_name,
        'description', event.description,
        'isEnabled', event.is_enabled
      ) ORDER BY event.event_key) FILTER (WHERE event.id IS NOT NULL), '[]') AS events
    FROM app_notification_catalogs catalog
    LEFT JOIN app_notification_events event ON event.catalog_id = catalog.id
    WHERE catalog.catalog_key = ${catalogKey}
    GROUP BY catalog.id
  `);
  return result.rows[0];
}

export async function updateNotificationCatalogRecord(input: {
  actorId: string;
  catalogKey: string;
  correlationId: string;
  update: NotificationCatalogUpdate;
}) {
  return getDatabase().transaction(async (transaction) => {
    const updated = await transaction.execute(sql`
      UPDATE app_notification_catalogs
      SET display_name = ${input.update.displayName},
        description = ${input.update.description},
        sort_order = ${input.update.sortOrder},
        is_enabled = ${input.update.isEnabled},
        updated_at = now()
      WHERE catalog_key = ${input.catalogKey}
        AND updated_at = ${input.update.expectedUpdatedAt}
      RETURNING catalog_key AS "catalogKey",
        to_char(updated_at AT TIME ZONE 'UTC',
          'YYYY-MM-DD"T"HH24:MI:SS.US') || 'Z' AS "updatedAt"
    `);
    if (!updated.rows[0]) return undefined;
    await transaction.insert(authorizationAuditEntries).values({
      action: "NOTIFICATION_CATALOG_UPDATED",
      actorId: input.actorId,
      changes: {
        catalogKey: input.catalogKey,
        correlationId: input.correlationId,
      } satisfies NotificationAuditMetadata,
    });
    return updated.rows[0];
  });
}

export async function listNotificationEventRuleRecords(
  input: NotificationEventRuleListQuery,
) {
  const catalogKey = input.catalogKey || null;
  const searchPattern = input.search ? `%${input.search}%` : null;
  const result = await getDatabase().execute(sql`
    SELECT catalog.catalog_key AS "catalogKey",
      catalog.display_name AS "catalogName",
      event.event_key AS "eventKey",
      event.rule_eligibility AS "ruleEligibility",
      event.display_name AS "eventName",
      event.description AS "eventDescription",
      event.is_enabled AS "eventEnabled",
      rule.is_enabled AS "isEnabled",
      to_char(rule.updated_at AT TIME ZONE 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.US') || 'Z' AS "updatedAt",
      (SELECT count(*)::integer
        FROM app_notification_event_rule_recipients recipient
        WHERE recipient.rule_id = rule.id) AS "recipientCount",
      COALESCE((
        SELECT json_agg(json_build_object(
          'recipientType', recipient.recipient_type,
          'isRequired', recipient.is_required,
          'targetId', COALESCE(recipient.recipient_user_id, recipient.recipient_role_id),
          'targetDisplayName', COALESCE(target_user.display_name, target_role.name),
          'channels', COALESCE((
            SELECT json_agg(json_build_object(
              'code', channel.code,
              'displayName', channel.display_name
            ) ORDER BY channel.sort_order, channel.code)
            FROM app_notification_event_rule_channels binding
            JOIN app_notification_channels channel
              ON channel.id = binding.channel_id
            WHERE binding.rule_recipient_id = recipient.id
          ), '[]'::json)
        ) ORDER BY recipient.recipient_type)
        FROM app_notification_event_rule_recipients recipient
        LEFT JOIN app_users target_user ON target_user.id = recipient.recipient_user_id
        LEFT JOIN app_roles target_role ON target_role.id = recipient.recipient_role_id
        WHERE recipient.rule_id = rule.id
      ), '[]'::json) AS recipients
    FROM app_notification_events event
    JOIN app_notification_catalogs catalog ON catalog.id = event.catalog_id
    JOIN app_notification_event_rules rule ON rule.event_id = event.id
    WHERE event.rule_eligibility = 'CONFIGURABLE'
      AND (${catalogKey}::text IS NULL OR catalog.catalog_key = ${catalogKey})
      AND (${searchPattern}::text IS NULL
        OR event.display_name ILIKE ${searchPattern}
        OR event.event_key ILIKE ${searchPattern}
        OR event.description ILIKE ${searchPattern}
        OR catalog.display_name ILIKE ${searchPattern}
        OR catalog.catalog_key ILIKE ${searchPattern}
        OR EXISTS (
          SELECT 1
          FROM app_notification_event_rule_recipients recipient
          LEFT JOIN app_notification_event_rule_channels binding
            ON binding.rule_recipient_id = recipient.id
          LEFT JOIN app_notification_channels channel
            ON channel.id = binding.channel_id
          WHERE recipient.rule_id = rule.id
            AND (recipient.recipient_type ILIKE ${searchPattern}
              OR channel.display_name ILIKE ${searchPattern}
              OR channel.code ILIKE ${searchPattern})
        ))
    ORDER BY catalog.sort_order, catalog.catalog_key, event.event_key
  `);
  return result.rows;
}

export async function findNotificationEventRuleRecord(eventKey: string) {
  const result = await getDatabase().execute(sql`
    SELECT catalog.catalog_key AS "catalogKey",
      event.event_key AS "eventKey",
      event.rule_eligibility AS "ruleEligibility",
      event.display_name AS "eventName",
      event.description AS "eventDescription",
      event.is_enabled AS "eventEnabled",
      rule.is_enabled AS "isEnabled",
      to_char(rule.updated_at AT TIME ZONE 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.US') || 'Z' AS "updatedAt",
      COALESCE(json_agg(json_build_object(
        'recipientType', recipient.recipient_type,
        'isRequired', recipient.is_required,
        'targetId', COALESCE(recipient.recipient_user_id, recipient.recipient_role_id),
        'targetDisplayName', COALESCE(target_user.display_name, target_role.name),
        'channelCodes', COALESCE((
          SELECT json_agg(channel.code ORDER BY channel.sort_order, channel.code)
          FROM app_notification_event_rule_channels binding
          JOIN app_notification_channels channel ON channel.id = binding.channel_id
          WHERE binding.rule_recipient_id = recipient.id
        ), '[]')
      ) ORDER BY recipient.recipient_type) FILTER (WHERE recipient.id IS NOT NULL), '[]') AS recipients,
      (SELECT COALESCE(json_agg(json_build_object(
        'code', channel.code,
        'displayName', channel.display_name,
        'isEnabled', channel.is_enabled
      ) ORDER BY channel.sort_order, channel.code), '[]')
      FROM app_notification_channels channel) AS channels,
      json_build_object(
        'users', (SELECT COALESCE(json_agg(json_build_object(
          'id', app_user.id,
          'name', app_user.display_name,
          'email', app_user.email
        ) ORDER BY app_user.display_name, app_user.email), '[]')
          FROM app_users app_user
          WHERE app_user.status = 'active'),
        'roles', (SELECT COALESCE(json_agg(json_build_object(
          'id', role.id,
          'name', role.name
        ) ORDER BY role.name), '[]') FROM app_roles role
        )
      ) AS "recipientOptions"
    FROM app_notification_events event
    JOIN app_notification_catalogs catalog ON catalog.id = event.catalog_id
    JOIN app_notification_event_rules rule ON rule.event_id = event.id
    LEFT JOIN app_notification_event_rule_recipients recipient ON recipient.rule_id = rule.id
    LEFT JOIN app_users target_user ON target_user.id = recipient.recipient_user_id
    LEFT JOIN app_roles target_role ON target_role.id = recipient.recipient_role_id
    WHERE event.event_key = ${eventKey}
      AND event.rule_eligibility = 'CONFIGURABLE'
    GROUP BY catalog.id, event.id, rule.id
  `);
  return result.rows[0];
}

export async function updateNotificationEventRuleRecord(input: {
  actorId: string;
  correlationId: string;
  eventKey: string;
  update: NotificationEventRuleUpdate;
}) {
  return getDatabase().transaction(async (transaction) => {
    const rule = await transaction.execute<{ id: string }>(sql`
      UPDATE app_notification_event_rules rule
      SET is_enabled = ${input.update.isEnabled}, updated_at = now()
      FROM app_notification_events event
      WHERE rule.event_id = event.id
        AND event.event_key = ${input.eventKey}
        AND event.rule_eligibility = 'CONFIGURABLE'
        AND rule.updated_at = ${input.update.expectedUpdatedAt}
      RETURNING rule.id
    `);
    const ruleId = rule.rows[0]?.id;
    if (!ruleId) return undefined;

    await transaction.execute(sql`
      UPDATE app_notification_events
      SET is_enabled = ${input.update.eventEnabled}, updated_at = now()
      WHERE event_key = ${input.eventKey}
    `);

    await transaction.execute(sql`
      DELETE FROM app_notification_event_rule_recipients
      WHERE rule_id = ${ruleId}::uuid
    `);
    await transaction.execute(sql`
      WITH recipient_input AS (
        SELECT *
        FROM jsonb_to_recordset(${JSON.stringify(input.update.recipients)}::jsonb)
          AS item("recipientType" text, "targetId" uuid,
            "isRequired" boolean, "channelCodes" jsonb)
      ), inserted_recipients AS (
        INSERT INTO app_notification_event_rule_recipients (
          rule_id,
          recipient_type,
          recipient_user_id,
          recipient_role_id,
          is_required
        )
        SELECT ${ruleId}::uuid,
          input."recipientType",
          CASE WHEN input."recipientType" = 'SPECIFIC_USER'
            THEN input."targetId" END,
          CASE WHEN input."recipientType" = 'SPECIFIC_ROLE'
            THEN input."targetId" END,
          input."isRequired"
        FROM recipient_input input
        RETURNING id, recipient_type, recipient_user_id, recipient_role_id
      )
      INSERT INTO app_notification_event_rule_channels (
        rule_recipient_id,
        channel_id
      )
      SELECT recipient.id, channel.id
      FROM inserted_recipients recipient
      JOIN recipient_input input
        ON input."recipientType" = recipient.recipient_type
        AND input."targetId" IS NOT DISTINCT FROM COALESCE(
          recipient.recipient_user_id,
          recipient.recipient_role_id
        )
      CROSS JOIN LATERAL jsonb_array_elements_text(
        input."channelCodes"
      ) channel_code
      JOIN app_notification_channels channel
        ON channel.code = channel_code.value
    `);
    await transaction.insert(authorizationAuditEntries).values({
      action: "NOTIFICATION_EVENT_RULE_UPDATED",
      actorId: input.actorId,
      changes: {
        correlationId: input.correlationId,
        eventKey: input.eventKey,
      } satisfies NotificationAuditMetadata,
    });
    return { eventKey: input.eventKey };
  });
}
