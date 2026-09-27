import pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { seedInitialNotificationConfiguration } from "@/modules/notifications/application/ServerNotificationConfigurationSeedService";

const { Pool } = pg;
const enabled = process.env.RUN_NOTIFICATION_DATABASE_TESTS === "true";
const describeDatabase = enabled ? describe : describe.skip;
const pool = enabled
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

type SeedResult = Awaited<
  ReturnType<typeof seedInitialNotificationConfiguration>
>;
let firstSeed: SeedResult;
let secondSeed: SeedResult;

async function query(text: string, values: unknown[] = []) {
  if (!pool) {
    throw new Error("The notification PostgreSQL test pool is not configured.");
  }
  return pool.query(text, values);
}

beforeAll(async () => {
  if (!enabled) return;
  firstSeed = await seedInitialNotificationConfiguration();
  secondSeed = await seedInitialNotificationConfiguration();
});

afterAll(async () => {
  await pool?.end();
  const databaseGlobal = globalThis as typeof globalThis & {
    smeFundPool?: pg.Pool;
  };
  await databaseGlobal.smeFundPool?.end();
});

describeDatabase("notification foundation PostgreSQL persistence", () => {
  it("migrates all tables, constraints, indexes, and permissions", async () => {
    const result = await query(`SELECT
      to_regclass('app_notification_channels') AS channel_table,
      to_regclass('app_notification_catalogs') AS catalog_table,
      to_regclass('app_notification_events') AS event_table,
      to_regclass('app_notification_event_rules') AS rule_table,
      to_regclass('app_notification_event_rule_recipients') AS rule_recipient_table,
      to_regclass('app_notification_event_rule_channels') AS rule_channel_table,
      to_regclass('app_notification_template_targets') AS target_table,
      to_regclass('app_notification_template_versions') AS version_table,
      to_regclass('app_notification_outbox') AS outbox_table,
      to_regclass('app_notification_deliveries') AS delivery_table,
      to_regclass('app_notification_outbox_due_idx') AS outbox_due_index,
      to_regclass('app_notification_deliveries_due_idx') AS delivery_due_index,
      (SELECT count(*)::integer FROM app_capabilities
        WHERE code LIKE 'notifications.%') AS permission_count`);

    expect(result.rows[0]).toEqual({
      catalog_table: "app_notification_catalogs",
      channel_table: "app_notification_channels",
      delivery_due_index: "app_notification_deliveries_due_idx",
      delivery_table: "app_notification_deliveries",
      event_table: "app_notification_events",
      outbox_due_index: "app_notification_outbox_due_idx",
      outbox_table: "app_notification_outbox",
      permission_count: 6,
      rule_table: "app_notification_event_rules",
      rule_channel_table: "app_notification_event_rule_channels",
      rule_recipient_table: "app_notification_event_rule_recipients",
      target_table: "app_notification_template_targets",
      version_table: "app_notification_template_versions",
    });
  });

  it("seeds the initial configuration once and safely skips a repeat", async () => {
    expect(firstSeed).toEqual({
      createdCatalogKeys: ["APPLICATIONS", "WORKFLOW"],
      createdChannel: true,
      createdEventKeys: ["application.submitted", "workflow.task.assigned"],
      createdRuleChannelCount: 2,
      createdRuleCount: 2,
      createdRuleRecipientCount: 2,
      createdTargetCount: 5,
    });
    expect(secondSeed).toEqual({
      createdCatalogKeys: [],
      createdChannel: false,
      createdEventKeys: [],
      createdRuleChannelCount: 0,
      createdRuleCount: 0,
      createdRuleRecipientCount: 0,
      createdTargetCount: 0,
    });
    const result = await query(`SELECT
      (SELECT count(*)::integer FROM app_notification_channels) AS channels,
      (SELECT count(*)::integer FROM app_notification_catalogs) AS catalogs,
      (SELECT count(*)::integer FROM app_notification_events) AS events,
      (SELECT count(*)::integer FROM app_notification_event_rules) AS rules,
      (SELECT count(*)::integer FROM app_notification_event_rule_recipients)
        AS rule_recipients,
      (SELECT count(*)::integer FROM app_notification_event_rule_channels)
        AS rule_channels,
      (SELECT count(*)::integer FROM app_notification_template_targets) AS targets`);
    expect(result.rows[0]).toEqual({
      catalogs: 2,
      channels: 1,
      events: 2,
      rules: 2,
      rule_channels: 2,
      rule_recipients: 2,
      targets: 5,
    });
  });

  it("seeds WorkflowHub-style event rule aggregates", async () => {
    const result = await query(`SELECT
      event.event_key AS "eventKey",
      recipient.recipient_type AS "recipientType",
      recipient.is_required AS "isRequired",
      channel.code AS "channelCode"
    FROM app_notification_event_rules rule
    JOIN app_notification_events event ON event.id = rule.event_id
    JOIN app_notification_event_rule_recipients recipient
      ON recipient.rule_id = rule.id
    JOIN app_notification_event_rule_channels rule_channel
      ON rule_channel.rule_recipient_id = recipient.id
    JOIN app_notification_channels channel ON channel.id = rule_channel.channel_id
    ORDER BY event.event_key`);

    expect(result.rows).toEqual([
      {
        channelCode: "EMAIL",
        eventKey: "application.submitted",
        isRequired: true,
        recipientType: "APPLICATION_OWNER",
      },
      {
        channelCode: "EMAIL",
        eventKey: "workflow.task.assigned",
        isRequired: true,
        recipientType: "ASSIGNED_USER",
      },
    ]);
  });

  it("rejects duplicate and mutated stable event keys", async () => {
    const catalog = await query(`SELECT id FROM app_notification_catalogs
      WHERE catalog_key = 'APPLICATIONS'`);
    await expect(
      query(
        `INSERT INTO app_notification_events
      (catalog_id, event_key, display_name, description)
      VALUES ($1, 'application.submitted', 'Duplicate', 'Duplicate')`,
        [catalog.rows[0].id],
      ),
    ).rejects.toMatchObject({ code: "23505" });
    await expect(
      query(`UPDATE app_notification_events
      SET event_key = 'application.renamed'
      WHERE event_key = 'application.submitted'`),
    ).rejects.toMatchObject({ code: "P0001" });
  });

  it("rejects duplicate occurrence keys", async () => {
    const event = await query(`SELECT id FROM app_notification_events
      WHERE event_key = 'application.submitted'`);
    const eventId = event.rows[0].id;
    const values = [
      eventId,
      "application.submitted",
      "application",
      "40000000-0000-4000-8000-000000000001",
      "submission:40000000-0000-4000-8000-000000000001",
      "correlation:1",
      JSON.stringify({ valid: "at-domain-boundary" }),
    ];
    await query(
      `INSERT INTO app_notification_outbox
      (event_id, event_key, aggregate_type, aggregate_id, occurrence_key,
       correlation_id, context)
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
      values,
    );
    await expect(
      query(
        `INSERT INTO app_notification_outbox
      (event_id, event_key, aggregate_type, aggregate_id, occurrence_key,
       correlation_id, context)
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
        values,
      ),
    ).rejects.toMatchObject({ code: "23505" });
  });

  it("enforces target scope shape and one published version per target", async () => {
    const channel = await query(`SELECT id FROM app_notification_channels
      WHERE code = 'EMAIL'`);
    const catalog = await query(`SELECT id FROM app_notification_catalogs
      WHERE catalog_key = 'APPLICATIONS'`);
    await expect(
      query(
        `INSERT INTO app_notification_template_targets
      (channel_id, scope, catalog_id)
      VALUES ($1, 'GLOBAL', $2)`,
        [channel.rows[0].id, catalog.rows[0].id],
      ),
    ).rejects.toMatchObject({ code: "23514" });

    await query(`INSERT INTO app_users
      (id, email, display_name, user_type, status)
      VALUES (
        '50000000-0000-4000-8000-000000000001',
        'notification-test@example.test',
        'Notification Test',
        'staff',
        'disabled'
      )`);
    const target = await query(
      `SELECT id FROM app_notification_template_targets
      WHERE channel_id = $1 AND scope = 'GLOBAL'`,
      [channel.rows[0].id],
    );
    const versionValues = [
      target.rows[0].id,
      "notification-test.html",
      "Test subject",
      "<p>Test</p>",
      "Test",
      "a".repeat(64),
      "50000000-0000-4000-8000-000000000001",
    ];
    await query(
      `INSERT INTO app_notification_template_versions
      (template_target_id, version_number, source_file_name, media_type,
       subject_template, html_template, plain_text_template, content_sha256,
       status, uploaded_by_user_id)
      VALUES ($1, 1, $2, 'text/html', $3, $4, $5, $6, 'PUBLISHED', $7)`,
      versionValues,
    );
    await expect(
      query(
        `INSERT INTO app_notification_template_versions
      (template_target_id, version_number, source_file_name, media_type,
       subject_template, html_template, plain_text_template, content_sha256,
       status, uploaded_by_user_id)
      VALUES ($1, 2, $2, 'text/html', $3, $4, $5, $6, 'PUBLISHED', $7)`,
        versionValues,
      ),
    ).rejects.toMatchObject({ code: "23505" });
  });

  it("exposes an explicit delivery-history projection shape", async () => {
    const result = await query(`SELECT
      delivery.id AS "deliveryId",
      outbox.event_key AS "eventKey",
      delivery.recipient_name AS "recipientName",
      delivery.recipient_email AS "recipientEmail",
      delivery.status,
      delivery.attempt_count AS "attemptCount",
      delivery.created_at AS "createdAt",
      delivery.sent_at AS "sentAt"
    FROM app_notification_deliveries delivery
    JOIN app_notification_outbox outbox ON outbox.id = delivery.outbox_id
    ORDER BY delivery.created_at DESC, delivery.id DESC
    LIMIT 25`);
    expect(result.fields.map((field) => field.name)).toEqual([
      "deliveryId",
      "eventKey",
      "recipientName",
      "recipientEmail",
      "status",
      "attemptCount",
      "createdAt",
      "sentAt",
    ]);
  });
});
