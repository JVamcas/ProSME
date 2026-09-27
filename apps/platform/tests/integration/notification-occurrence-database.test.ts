import pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getDatabase } from "@/db/client";
import { users } from "@/db/schema";
import { seedInitialNotificationConfiguration } from "@/modules/notifications/application/ServerNotificationConfigurationSeedService";
import { captureNotificationOccurrence } from "@/modules/notifications/application/ServerNotificationOccurrenceService";

const { Pool } = pg;
const enabled = process.env.RUN_NOTIFICATION_DATABASE_TESTS === "true";
const describeDatabase = enabled ? describe : describe.skip;
const pool = enabled
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;
const ownerId = "71000000-0000-4000-8000-000000000001";
const applicationId = "71000000-0000-4000-8000-000000000002";
const workflowInstanceId = "71000000-0000-4000-8000-000000000003";

async function query(text: string, values: unknown[] = []) {
  if (!pool) throw new Error("The notification test pool is not configured.");
  return pool.query(text, values);
}

function captureInput(occurrenceKey: string) {
  return {
    aggregateId: applicationId,
    aggregateType: "APPLICATION",
    context: {
      applicationId,
      applicationOwnerUserId: ownerId,
      applicationReference: "SME-2026-001",
      correlationId: "phase3-correlation",
      fundingOpportunityTitle: "Growth Fund",
      ownerDisplayName: "Applicant One",
      ownerEmail: "Applicant@Example.test",
      sourceIdempotencyKey: occurrenceKey,
      submittedAt: "2026-09-27T08:00:00.000Z",
      workflowInstanceId,
    },
    correlationId: "phase3-correlation",
    eventKey: "application.submitted" as const,
    occurrenceKey,
    recipients: [
      {
        displayName: "Applicant One",
        email: "Applicant@Example.test",
        recipientType: "APPLICATION_OWNER",
        resolutionPath: "application.ownerUserId",
        userId: ownerId,
      },
      {
        displayName: "Duplicate Applicant",
        email: "applicant@example.test",
        recipientType: "APPLICATION_OWNER",
        resolutionPath: "application.ownerUserId",
        userId: ownerId,
      },
    ],
  };
}

beforeAll(async () => {
  if (!enabled) return;
  await seedInitialNotificationConfiguration();
  await query(
    `INSERT INTO app_users (id, email, display_name, user_type, status)
     VALUES ($1, 'applicant@example.test', 'Applicant One', 'applicant', 'active')`,
    [ownerId],
  );
});

afterAll(async () => {
  await pool?.end();
  const databaseGlobal = globalThis as typeof globalThis & {
    smeFundPool?: pg.Pool;
  };
  await databaseGlobal.smeFundPool?.end();
});

describeDatabase("notification occurrence PostgreSQL writer", () => {
  it("writes one occurrence and deduplicated delivery, then replays safely", async () => {
    const database = getDatabase();
    const first = await database.transaction((transaction) =>
      captureNotificationOccurrence(transaction, captureInput("capture:success"))
    );
    const replay = await database.transaction((transaction) =>
      captureNotificationOccurrence(transaction, captureInput("capture:success"))
    );

    expect(first).toMatchObject({ created: true, deliveryCount: 1 });
    expect(replay).toMatchObject({ created: false, deliveryCount: 0 });
    const records = await query(
      `SELECT
        (SELECT count(*)::integer FROM app_notification_outbox
          WHERE occurrence_key = 'capture:success') AS occurrences,
        (SELECT count(*)::integer FROM app_notification_deliveries delivery
          JOIN app_notification_outbox occurrence
            ON occurrence.id = delivery.outbox_id
          WHERE occurrence.occurrence_key = 'capture:success') AS deliveries`,
    );
    expect(records.rows[0]).toEqual({ deliveries: 1, occurrences: 1 });
  });

  it("rolls back the occurrence with its surrounding transaction", async () => {
    await expect(getDatabase().transaction(async (transaction) => {
      await captureNotificationOccurrence(
        transaction,
        captureInput("capture:rollback"),
      );
      throw new Error("force surrounding rollback");
    })).rejects.toThrow("force surrounding rollback");

    const records = await query(
      `SELECT count(*)::integer AS count FROM app_notification_outbox
       WHERE occurrence_key = 'capture:rollback'`,
    );
    expect(records.rows[0]).toEqual({ count: 0 });
  });

  it("invalid context rolls back an earlier business write", async () => {
    const temporaryUserId = "71000000-0000-4000-8000-000000000099";
    await expect(getDatabase().transaction(async (transaction) => {
      await transaction.insert(users).values({
        displayName: "Temporary User",
        email: "temporary@example.test",
        id: temporaryUserId,
        status: "active",
        userType: "applicant",
      });
      await captureNotificationOccurrence(transaction, {
        ...captureInput("capture:invalid"),
        context: {
          ...captureInput("capture:invalid").context,
          ownerEmail: "not-an-email",
        },
      });
    })).rejects.toMatchObject({ code: "NOTIFICATION_INVALID_CONTEXT" });

    const records = await query(
      `SELECT count(*)::integer AS count FROM app_users WHERE id = $1`,
      [temporaryUserId],
    );
    expect(records.rows[0]).toEqual({ count: 0 });
  });
});
