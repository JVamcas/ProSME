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

type SeedResult = Awaited<ReturnType<typeof seedInitialNotificationConfiguration>>;
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
      to_regclass('app_notification_events') AS event_table,
      to_regclass('app_notification_event_rules') AS rule_table,
      to_regclass('app_notification_templates') AS template_table,
      to_regclass('app_notification_template_versions') AS version_table,
      to_regclass('app_notification_outbox') AS outbox_table,
      to_regclass('app_notification_deliveries') AS delivery_table,
      to_regclass('app_notification_outbox_due_idx') AS outbox_due_index,
      to_regclass('app_notification_deliveries_due_idx') AS delivery_due_index,
      (SELECT count(*)::integer FROM app_capabilities
        WHERE code LIKE 'notifications.%') AS permission_count`);

    expect(result.rows[0]).toEqual({
      channel_table: "app_notification_channels",
      delivery_due_index: "app_notification_deliveries_due_idx",
      delivery_table: "app_notification_deliveries",
      event_table: "app_notification_events",
      outbox_due_index: "app_notification_outbox_due_idx",
      outbox_table: "app_notification_outbox",
      permission_count: 6,
      rule_table: "app_notification_event_rules",
      template_table: "app_notification_templates",
      version_table: "app_notification_template_versions",
    });
  });

  it("seeds the initial configuration once and safely skips a repeat", async () => {
    expect(firstSeed).toEqual({
      createdChannel: true,
      createdEventKeys: [
        "application.submitted",
        "workflow.task.assigned",
      ],
      createdRuleCount: 2,
    });
    expect(secondSeed).toEqual({
      createdChannel: false,
      createdEventKeys: [],
      createdRuleCount: 0,
    });
    const result = await query(`SELECT
      (SELECT count(*)::integer FROM app_notification_channels) AS channels,
      (SELECT count(*)::integer FROM app_notification_events) AS events,
      (SELECT count(*)::integer FROM app_notification_event_rules) AS rules`);
    expect(result.rows[0]).toEqual({ channels: 1, events: 2, rules: 2 });
  });

  it("rejects duplicate and mutated stable event keys", async () => {
    await expect(query(`INSERT INTO app_notification_events
      (event_key, display_name, description)
      VALUES ('application.submitted', 'Duplicate', 'Duplicate')`))
      .rejects.toMatchObject({ code: "23505" });
    await expect(query(`UPDATE app_notification_events
      SET event_key = 'application.renamed'
      WHERE event_key = 'application.submitted'`))
      .rejects.toMatchObject({ code: "P0001" });
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
    await query(`INSERT INTO app_notification_outbox
      (event_id, event_key, aggregate_type, aggregate_id, occurrence_key,
       correlation_id, context)
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`, values);
    await expect(query(`INSERT INTO app_notification_outbox
      (event_id, event_key, aggregate_type, aggregate_id, occurrence_key,
       correlation_id, context)
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`, values))
      .rejects.toMatchObject({ code: "23505" });
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

