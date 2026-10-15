import {
  actor,
  applicationId,
  input,
  installAppealDatabaseFixture,
} from "../support/ApplicationAppealDatabaseFixture";
import { readFile } from "node:fs/promises";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env/server", () => ({
  getServerEnvironment: () => ({ DATABASE_URL: process.env.DATABASE_URL }),
}));
import { firstOwnerId } from "../support/application-database-fixture";
import {
  submitApplicationAppeal,
  getApplicationAppeals,
  getApplicationAppeal,
  assignApplicationAppeal,
  resolveApplicationAppeal,
} from "@/modules/applications/application/ServerApplicationAppealService";
import {
  claimDueNotificationOccurrences,
  loadClaimedNotificationDeliveries,
} from "@/modules/notifications/infrastructure/NotificationDispatchRepository";
import { appealDeliveryAuthorized } from "@/modules/notifications/infrastructure/ApplicationAppealNotificationRepository";
const enabled = process.env.RUN_APPLICATION_APPEAL_DATABASE_TESTS === "true";
const databaseTests = enabled ? describe : describe.skip;
const pool = enabled
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL })
  : null;
async function query(text: string, values: unknown[] = []) {
  if (!pool) throw new Error("The appeal test database is unavailable.");
  return pool.query(text, values);
}
beforeAll(async () => {
  if (!enabled) return;
  await installAppealDatabaseFixture(query);
});
afterAll(async () => {
  await pool?.end();
  const globals = globalThis as typeof globalThis & { smeFundPool?: pg.Pool };
  await globals.smeFundPool?.end();
});
databaseTests("application appeals PostgreSQL flow", () => {
  it("replays migration without duplicating templates or overwriting subscription settings", async () => {
    const migration = await readFile(
      new URL("../../drizzle/0211_application_appeals.sql", import.meta.url),
      "utf8",
    );
    await query(migration);
    await query(migration);
    const result =
      await query(`SELECT event.event_key, count(version.id)::int AS count FROM app_notification_events event
      JOIN app_notification_template_targets target ON target.event_id = event.id
      JOIN app_notification_template_versions version ON version.template_target_id = target.id
      WHERE event.event_key LIKE 'application.appeal.%' GROUP BY event.event_key`);
    expect(result.rows).toHaveLength(2);
    expect(result.rows.every((row) => row.count === 1)).toBe(true);
  });
  it("rejects an unknown reference without persisting appeal or notifications", async () => {
    await expect(
      submitApplicationAppeal({
        ...input,
        applicationReference: "DOES-NOT-EXIST",
      }),
    ).rejects.toThrow("No application");
    expect(
      (
        await query(
          "SELECT count(*)::int AS count FROM app_application_appeals",
        )
      ).rows[0].count,
    ).toBe(0);
  });
  it("stores sanitized text with linked applicant contact, acknowledges the applicant, and exposes narrow queue projections", async () => {
    const submitted = await submitApplicationAppeal({
      ...input,
      details: '<p onclick="bad()">Review details</p><script>bad()</script>',
    });
    const queue = await getApplicationAppeals(actor, {});
    expect(queue.items).toHaveLength(1);
    expect(queue.items[0]).toMatchObject({
      reference: submitted.reference,
      applicationId,
      applicationReference: input.applicationReference,
    });
    expect(queue.items[0]).not.toHaveProperty("email");
    expect(queue.items[0]).not.toHaveProperty("grounds");
    const detail = await getApplicationAppeal(actor, queue.items[0].id);
    expect(detail).toMatchObject({
      details: "<p>Review details</p>",
      name: "Application Owner",
      email: "application-owner@example.test",
      phone: "",
    });
    const deliveries = await query(
      `SELECT occurrence.event_key, delivery.recipient_email, delivery.recipient_user_id
      FROM app_notification_deliveries delivery JOIN app_notification_outbox occurrence ON occurrence.id = delivery.outbox_id
      WHERE occurrence.aggregate_id = $1`,
      [detail.id],
    );
    expect(deliveries.rows).toEqual([
      {
        event_key: "application.appeal.acknowledged",
        recipient_email: "application-owner@example.test",
        recipient_user_id: null,
      },
    ]);
    const audit = await query(
      "SELECT action FROM app_application_appeal_audit WHERE appeal_id = $1",
      [detail.id],
    );
    expect(audit.rows).toEqual([{ action: "CREATED" }]);
  });
  it("assigns only authorized staff, resolves with a note, and rejects stale updates", async () => {
    const appeal = (await getApplicationAppeals(actor, {})).items[0];
    await expect(
      assignApplicationAppeal(actor, appeal.id, {
        assignedTo: firstOwnerId,
        expectedRowVersion: 1,
      }),
    ).rejects.toThrow("authorized");
    await assignApplicationAppeal(actor, appeal.id, {
      assignedTo: actor.id,
      expectedRowVersion: 1,
    });
    const assigned = await getApplicationAppeal(actor, appeal.id);
    expect(assigned).toMatchObject({
      assignedTo: actor.id,
      state: "IN_PROGRESS",
      rowVersion: 2,
    });
    await expect(
      resolveApplicationAppeal(actor, appeal.id, {
        resolutionNote: "Reviewed",
        expectedRowVersion: 1,
      }),
    ).rejects.toThrow("changed");
    await resolveApplicationAppeal(actor, appeal.id, {
      resolutionNote: "Reviewed",
      expectedRowVersion: 2,
    });
    expect(await getApplicationAppeal(actor, appeal.id)).toMatchObject({
      state: "RESOLVED",
      resolutionNote: "Reviewed",
      rowVersion: 3,
    });
    const audit = await query(
      "SELECT action, changes FROM app_application_appeal_audit WHERE appeal_id = $1 ORDER BY created_at",
      [appeal.id],
    );
    expect(audit.rows.map((row) => row.action)).toEqual([
      "CREATED",
      "ASSIGNED",
      "RESOLVED",
    ]);
    expect(audit.rows[1].changes).toEqual({ assignedTo: actor.id });
  });
  it("notifies subscribed authorized staff and rechecks access before delivery", async () => {
    const result = await query(
      `INSERT INTO app_notification_event_rule_recipients(rule_id, recipient_type, recipient_user_id, is_required)
      SELECT id, 'SPECIFIC_USER', $1, false FROM app_notification_event_rules WHERE event_id = (SELECT id FROM app_notification_events WHERE event_key = 'application.appeal.received')
      RETURNING id, rule_id`,
      [actor.id],
    );
    const ruleId = result.rows[0].rule_id;
    await query(
      `INSERT INTO app_notification_event_rule_channels(rule_recipient_id, channel_id)
      SELECT $1, id FROM app_notification_channels WHERE code = 'EMAIL'`,
      [result.rows[0].id],
    );
    const submitted = await submitApplicationAppeal(input);
    const appeal = (await getApplicationAppeals(actor, {})).items.find(
      (row) => row.reference === submitted.reference,
    )!;
    const deliveries = await query(
      `SELECT delivery.recipient_email FROM app_notification_deliveries delivery
      JOIN app_notification_outbox occurrence ON occurrence.id = delivery.outbox_id
      WHERE occurrence.aggregate_id = $1 AND occurrence.event_key = 'application.appeal.received'`,
      [appeal.id],
    );
    expect(deliveries.rows).toEqual([{ recipient_email: actor.email }]);
    expect(await appealDeliveryAuthorized(actor.id, actor.email, ruleId)).toBe(
      true,
    );
    await query(
      "UPDATE app_notification_event_rules SET is_enabled = false WHERE id = $1",
      [ruleId],
    );
    expect(await appealDeliveryAuthorized(actor.id, actor.email, ruleId)).toBe(
      false,
    );
    await query(
      "UPDATE app_notification_event_rules SET is_enabled = true WHERE id = $1",
      [ruleId],
    );
  });
  it("claims and resolves event-specific email templates including anonymous acknowledgement", async () => {
    const now = new Date();
    const occurrences = await claimDueNotificationOccurrences({
      batchSize: 10,
      lockTimeoutMs: 60_000,
      now,
      owner: "appeal-test",
    });
    const deliveries = await loadClaimedNotificationDeliveries({
      now,
      outboxIds: occurrences.map((row) => row.id),
      owner: "appeal-test",
    });
    expect(
      deliveries.some(
        (row) =>
          row.eventKey === "application.appeal.received" &&
          row.htmlTemplate?.includes("Review appeal"),
      ),
    ).toBe(true);
    expect(
      deliveries.some(
        (row) =>
          row.eventKey === "application.appeal.acknowledged" &&
          row.htmlTemplate?.includes("Your appeal has been received") &&
          row.recipientUserId === null,
      ),
    ).toBe(true);
  });
  it("paginates without repeating boundary rows and keeps detail text out of lists", async () => {
    await query(
      `INSERT INTO app_application_appeals(application_id, name, email, phone, grounds, details, consent)
      SELECT $1, 'Additional sender', 'more@example.test', '', '<p>Grounds</p>', '<p>Details</p>', true FROM generate_series(1, 52)`,
      [applicationId],
    );
    const first = await getApplicationAppeals(actor, {});
    expect(first.items).toHaveLength(50);
    expect(first.nextCursor).not.toBeNull();
    const next = await getApplicationAppeals(actor, first.nextCursor);
    expect(next.items).toHaveLength(4);
    expect(next.nextCursor).toBeNull();
    expect(
      next.items.every(
        (row) => !first.items.some((previous) => previous.id === row.id),
      ),
    ).toBe(true);
  });
  it("rolls the appeal back when notification capture fails", async () => {
    const before = (
      await query("SELECT count(*)::int AS count FROM app_application_appeals")
    ).rows[0].count;
    await query(
      "ALTER TABLE app_notification_deliveries ADD CONSTRAINT appeal_test_fail CHECK (resolution_path <> 'public-appeal-submitter') NOT VALID",
    );
    try {
      await expect(submitApplicationAppeal(input)).rejects.toThrow();
      expect(
        (
          await query(
            "SELECT count(*)::int AS count FROM app_application_appeals",
          )
        ).rows[0].count,
      ).toBe(before);
    } finally {
      await query(
        "ALTER TABLE app_notification_deliveries DROP CONSTRAINT appeal_test_fail",
      );
    }
  });
});
