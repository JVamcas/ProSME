import pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { seedInitialNotificationConfiguration } from "@/modules/notifications/application/ServerNotificationConfigurationSeedService";
import {
  claimDueNotificationOccurrences,
  finalizeClaimedNotificationOccurrence,
  recordNotificationDeliveryFailure,
} from "@/modules/notifications/infrastructure/NotificationDispatchRepository";

const { Pool } = pg;
const enabled = process.env.RUN_NOTIFICATION_DATABASE_TESTS === "true";
const describeDatabase = enabled ? describe : describe.skip;
const pool = enabled
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;
const recipientId = "85000000-0000-4000-8000-000000000001";
const now = new Date("2030-01-01T10:00:00.000Z");

async function query(text: string, values: unknown[] = []) {
  if (!pool) throw new Error("The notification test pool is not configured.");
  return pool.query(text, values);
}

async function insertOccurrence(input: {
  availableAt?: Date;
  id: string;
  lockedAt?: Date;
  occurrenceKey: string;
  status?: "PENDING" | "PROCESSING" | "SENT";
}) {
  await query(
    `INSERT INTO app_notification_outbox
      (id, event_id, event_key, aggregate_type, aggregate_id, occurrence_key,
       correlation_id, context, status, available_at, locked_at, locked_by)
     SELECT $1, event.id, event.event_key, 'APPLICATION', $1, $2, $2,
       '{}'::jsonb, $3, $4, $5, CASE WHEN $5::timestamptz IS NULL THEN NULL ELSE 'old-owner' END
     FROM app_notification_events event
     WHERE event.event_key = 'application.submitted'`,
    [
      input.id,
      input.occurrenceKey,
      input.status ?? "PENDING",
      input.availableAt ?? new Date(now.getTime() - 60_000),
      input.lockedAt ?? null,
    ],
  );
  await query(
    `INSERT INTO app_notification_deliveries
      (outbox_id, channel_id, recipient_user_id, recipient_name,
       recipient_email, recipient_type, resolution_path, status, next_attempt_at)
     SELECT $1, channel.id, $2, 'Recipient', $3, 'APPLICATION_OWNER',
       'application.ownerUserId', 'PENDING', $4
     FROM app_notification_channels channel WHERE channel.code = 'EMAIL'`,
    [input.id, recipientId, `${input.id}@example.test`, input.availableAt ?? now],
  );
}

beforeAll(async () => {
  if (!enabled) return;
  await seedInitialNotificationConfiguration();
  await query(
    `INSERT INTO app_users (id, email, display_name, user_type, status)
     VALUES ($1, 'claim-recipient@example.test', 'Claim Recipient', 'applicant', 'active')
     ON CONFLICT (id) DO NOTHING`,
    [recipientId],
  );
});

beforeEach(async () => {
  if (!enabled) return;
  await query("DELETE FROM app_notification_deliveries");
  await query("DELETE FROM app_notification_outbox");
});

afterAll(async () => {
  await pool?.end();
  const databaseGlobal = globalThis as typeof globalThis & {
    smeFundPool?: pg.Pool;
  };
  await databaseGlobal.smeFundPool?.end();
});

describeDatabase("notification PostgreSQL concurrent claiming", () => {
  it("gives concurrent claimers disjoint bounded batches", async () => {
    for (let index = 1; index <= 4; index += 1) {
      await insertOccurrence({
        id: `86000000-0000-4000-8000-00000000000${index}`,
        occurrenceKey: `phase4:concurrent:${index}`,
      });
    }
    const [first, second] = await Promise.all([
      claimDueNotificationOccurrences({
        batchSize: 2,
        lockTimeoutMs: 300_000,
        now,
        owner: "claimer-a",
      }),
      claimDueNotificationOccurrences({
        batchSize: 2,
        lockTimeoutMs: 300_000,
        now,
        owner: "claimer-b",
      }),
    ]);
    const firstIds = new Set(first.map((item) => item.id));
    expect(first).toHaveLength(2);
    expect(second).toHaveLength(2);
    expect(second.every((item) => !firstIds.has(item.id))).toBe(true);
  });

  it("claims in deterministic due order and obeys the batch limit", async () => {
    await insertOccurrence({
      availableAt: new Date(now.getTime() - 60_000),
      id: "86000000-0000-4000-8000-000000000003",
      occurrenceKey: "phase4:order:3",
    });
    await insertOccurrence({
      availableAt: new Date(now.getTime() - 120_000),
      id: "86000000-0000-4000-8000-000000000002",
      occurrenceKey: "phase4:order:2",
    });
    await insertOccurrence({
      availableAt: new Date(now.getTime() - 120_000),
      id: "86000000-0000-4000-8000-000000000001",
      occurrenceKey: "phase4:order:1",
    });
    const claimed = await claimDueNotificationOccurrences({
      batchSize: 2,
      lockTimeoutMs: 300_000,
      now,
      owner: "ordered-claimer",
    });
    expect(claimed.map((item) => item.id)).toEqual([
      "86000000-0000-4000-8000-000000000001",
      "86000000-0000-4000-8000-000000000002",
    ]);
  });

  it("recovers stale work but never reclaims sent or live work", async () => {
    await insertOccurrence({
      id: "86000000-0000-4000-8000-000000000001",
      lockedAt: new Date(now.getTime() - 600_000),
      occurrenceKey: "phase4:stale",
      status: "PROCESSING",
    });
    await insertOccurrence({
      id: "86000000-0000-4000-8000-000000000002",
      lockedAt: new Date(now.getTime() - 60_000),
      occurrenceKey: "phase4:live",
      status: "PROCESSING",
    });
    await insertOccurrence({
      id: "86000000-0000-4000-8000-000000000003",
      occurrenceKey: "phase4:sent",
      status: "SENT",
    });
    const claimed = await claimDueNotificationOccurrences({
      batchSize: 10,
      lockTimeoutMs: 300_000,
      now,
      owner: "recovery-claimer",
    });
    expect(claimed.map((item) => item.id)).toEqual([
      "86000000-0000-4000-8000-000000000001",
    ]);
  });

  it("returns an empty batch when no work is due", async () => {
    await insertOccurrence({
      availableAt: new Date(now.getTime() + 60_000),
      id: "86000000-0000-4000-8000-000000000001",
      occurrenceKey: "phase4:future",
    });
    await expect(claimDueNotificationOccurrences({
      batchSize: 10,
      lockTimeoutMs: 300_000,
      now,
      owner: "empty-claimer",
    })).resolves.toEqual([]);
  });

  it("finalizes a claimed occurrence after a terminal delivery failure", async () => {
    const occurrenceId = "86000000-0000-4000-8000-000000000001";
    const owner = "finalization-claimer";
    await insertOccurrence({
      id: occurrenceId,
      occurrenceKey: "phase4:terminal-failure",
    });
    await claimDueNotificationOccurrences({
      batchSize: 1,
      lockTimeoutMs: 300_000,
      now,
      owner,
    });
    const delivery = await query(
      "SELECT id FROM app_notification_deliveries WHERE outbox_id = $1",
      [occurrenceId],
    );
    await recordNotificationDeliveryFailure({
      code: "NOTIFICATION_TEMPLATE_UNAVAILABLE",
      deliveryId: delivery.rows[0].id,
      nextAttemptAt: now,
      now,
      owner,
      retry: false,
      templateVersionId: null,
    });

    await finalizeClaimedNotificationOccurrence({
      now,
      outboxId: occurrenceId,
      owner,
    });

    const occurrence = await query(
      `SELECT status, processed_at, locked_at, locked_by
       FROM app_notification_outbox WHERE id = $1`,
      [occurrenceId],
    );
    expect(occurrence.rows[0]).toMatchObject({
      locked_at: null,
      locked_by: null,
      status: "FAILED",
    });
    expect(occurrence.rows[0].processed_at).toEqual(now);
  });
});
