import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { seedInitialNotificationConfiguration } from "@/modules/notifications/application/ServerNotificationConfigurationSeedService";
import {
  findNotificationCatalogRecord,
  findNotificationEventRuleRecord,
  updateNotificationCatalogRecord,
  updateNotificationEventRuleRecord,
} from "@/modules/notifications/infrastructure/NotificationAdministrationRepository";
import {
  getNotificationOperationalSummaryRecord,
  listNotificationDeliveryRecords,
  retryNotificationDeliveryRecord,
} from "@/modules/notifications/infrastructure/NotificationDeliveryAdministrationRepository";

const { Pool } = pg;
const enabled = process.env.RUN_NOTIFICATION_DATABASE_TESTS === "true";
const describeDatabase = enabled ? describe : describe.skip;
const pool = enabled
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;
const actorId = "phase5-operator";
const userId = "87000000-0000-4000-8000-000000000001";
const deliveryId = "87000000-0000-4000-8000-000000000002";
const outboxId = "87000000-0000-4000-8000-000000000003";

async function query(text: string, values: unknown[] = []) {
  if (!pool) throw new Error("The notification test pool is not configured.");
  return pool.query(text, values);
}

async function insertFailedDelivery() {
  await query(
    `INSERT INTO app_notification_outbox
      (id, event_id, event_key, aggregate_type, aggregate_id, occurrence_key,
       correlation_id, context, status, available_at, processed_at)
     SELECT $1, event.id, event.event_key, 'APPLICATION', $1,
       'phase5:delivery', 'phase5-correlation',
       '{"applicationReference":"SME-2026-005"}'::jsonb,
       'FAILED', now(), now()
     FROM app_notification_events event
     WHERE event.event_key = 'application.submitted'`,
    [outboxId],
  );
  await query(
    `INSERT INTO app_notification_deliveries
      (id, outbox_id, channel_id, recipient_user_id, recipient_name,
       recipient_email, recipient_type, resolution_path, status,
       attempt_count, last_error_code, last_error_message, next_attempt_at)
     SELECT $1, $2, channel.id, $3, 'Applicant Five',
       'applicant5@example.test', 'APPLICATION_OWNER',
       'application.ownerUserId', 'FAILED', 5,
       'NOTIFICATION_RETRY_EXHAUSTED', 'redacted failure', now()
     FROM app_notification_channels channel WHERE channel.code = 'EMAIL'`,
    [deliveryId, outboxId, userId],
  );
}

beforeAll(async () => {
  if (!enabled) return;
  await seedInitialNotificationConfiguration();
  await query(
    `INSERT INTO app_users (id, email, display_name, user_type, status)
     VALUES ($1, 'applicant5@example.test', 'Applicant Five', 'applicant', 'active')
     ON CONFLICT (id) DO NOTHING`,
    [userId],
  );
});

beforeEach(async () => {
  if (!enabled) return;
  await query("DELETE FROM app_notification_deliveries");
  await query("DELETE FROM app_notification_outbox");
  await query(
    `UPDATE app_notification_catalogs
     SET display_name = CASE catalog_key WHEN 'APPLICATIONS' THEN 'Applications' ELSE 'Workflow' END,
       description = CASE catalog_key
         WHEN 'APPLICATIONS' THEN 'Funding application lifecycle notification events.'
         ELSE 'Workflow runtime notification events.' END,
       sort_order = CASE catalog_key WHEN 'APPLICATIONS' THEN 10 ELSE 20 END,
       is_enabled = true, updated_at = now()`,
  );
  await query("UPDATE app_notification_events SET is_enabled = true, updated_at = now()");
  await query("UPDATE app_notification_event_rules SET is_enabled = true, updated_at = now()");
  await query("UPDATE app_notification_event_rule_recipients SET is_required = true, updated_at = now()");
});

afterAll(async () => {
  await pool?.end();
  const databaseGlobal = globalThis as typeof globalThis & { smeFundPool?: pg.Pool };
  await databaseGlobal.smeFundPool?.end();
});

describeDatabase("notification Phase 5 PostgreSQL administration", () => {
  it("updates a catalog with optimistic concurrency and an audit record", async () => {
    const catalog = await findNotificationCatalogRecord("APPLICATIONS") as {
      updatedAt: string;
    };
    const expectedUpdatedAt = catalog.updatedAt;
    const updated = await updateNotificationCatalogRecord({
      actorId,
      catalogKey: "APPLICATIONS",
      correlationId: "phase5-catalog",
      update: {
        description: "Application lifecycle events",
        displayName: "Application Events",
        expectedUpdatedAt,
        isEnabled: false,
        sortOrder: 15,
      },
    });
    expect(updated).toBeDefined();
    await expect(updateNotificationCatalogRecord({
      actorId,
      catalogKey: "APPLICATIONS",
      correlationId: "phase5-stale",
      update: {
        description: "Stale update",
        displayName: "Stale",
        expectedUpdatedAt,
        isEnabled: true,
        sortOrder: 10,
      },
    })).resolves.toBeUndefined();
    const audit = await query(
      `SELECT action, changes->>'catalogKey' AS "catalogKey"
       FROM app_authorization_audit_entries WHERE actor_id = $1`,
      [actorId],
    );
    expect(audit.rows).toEqual([{
      action: "NOTIFICATION_CATALOG_UPDATED",
      catalogKey: "APPLICATIONS",
    }]);
  });

  it("updates event, rule, recipient, and channel bindings atomically", async () => {
    const rule = await findNotificationEventRuleRecord("application.submitted") as {
      updatedAt: string;
    };
    await expect(updateNotificationEventRuleRecord({
      actorId,
      correlationId: "phase5-rule",
      eventKey: "application.submitted",
      update: {
        eventEnabled: false,
        expectedUpdatedAt: rule.updatedAt,
        isEnabled: false,
        recipients: [{
          channelCodes: ["EMAIL"],
          isRequired: false,
          recipientType: "APPLICATION_OWNER",
        }],
      },
    })).resolves.toEqual({ eventKey: "application.submitted" });
    const state = await query(
      `SELECT event.is_enabled AS "eventEnabled", rule.is_enabled AS "ruleEnabled",
        recipient.is_required AS "isRequired", count(binding.id)::integer AS bindings
       FROM app_notification_events event
       JOIN app_notification_event_rules rule ON rule.event_id = event.id
       JOIN app_notification_event_rule_recipients recipient ON recipient.rule_id = rule.id
       LEFT JOIN app_notification_event_rule_channels binding ON binding.rule_recipient_id = recipient.id
       WHERE event.event_key = 'application.submitted'
       GROUP BY event.id, rule.id, recipient.id`,
    );
    expect(state.rows[0]).toEqual({
      bindings: 1,
      eventEnabled: false,
      isRequired: false,
      ruleEnabled: false,
    });
  });

  it("filters a narrow delivery projection and returns safe health counts", async () => {
    await insertFailedDelivery();
    const history = await listNotificationDeliveryRecords({
      applicationReference: "2026-005",
      page: 1,
      pageSize: 1,
      recipient: "applicant5",
      sortDirection: "desc",
      sortField: "createdAt",
      status: "FAILED",
    });
    expect(history.total).toBe(1);
    expect(history.items[0]).toMatchObject({
      applicationReference: "SME-2026-005",
      deliveryId,
      failureCode: "NOTIFICATION_RETRY_EXHAUSTED",
      status: "FAILED",
    });
    expect(history.items[0]).not.toHaveProperty("lastErrorMessage");
    expect(history.items[0]).not.toHaveProperty("htmlTemplate");
    await expect(getNotificationOperationalSummaryRecord(new Date()))
      .resolves.toMatchObject({ failed: 1, pending: 0, retrying: 0 });
  });

  it("makes concurrent retries idempotent and audits the successful schedule once", async () => {
    await insertFailedDelivery();
    const results = await Promise.all([
      retryNotificationDeliveryRecord({
        actorId,
        correlationId: "phase5-retry-a",
        deliveryId,
        reason: "Provider configuration corrected.",
      }),
      retryNotificationDeliveryRecord({
        actorId,
        correlationId: "phase5-retry-b",
        deliveryId,
        reason: "Duplicate operator request.",
      }),
    ]);
    expect(results.map((result) => result.outcome).sort()).toEqual([
      "ALREADY_SCHEDULED",
      "SCHEDULED",
    ]);
    const state = await query(
      `SELECT delivery.status, occurrence.status AS "outboxStatus",
        (SELECT count(*)::integer FROM app_authorization_audit_entries
         WHERE actor_id = $1 AND action = 'NOTIFICATION_DELIVERY_RETRY_REQUESTED') AS audits
       FROM app_notification_deliveries delivery
       JOIN app_notification_outbox occurrence ON occurrence.id = delivery.outbox_id
       WHERE delivery.id = $2`,
      [actorId, deliveryId],
    );
    expect(state.rows[0]).toEqual({ audits: 1, outboxStatus: "PENDING", status: "PENDING" });
  });
});
