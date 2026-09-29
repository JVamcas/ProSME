import pg from "pg";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/env/server", () => ({
  getServerEnvironment: () => ({ DATABASE_URL: process.env.DATABASE_URL }),
}));
import { seedInitialNotificationConfiguration } from "@/modules/notifications/application/ServerNotificationConfigurationSeedService";
import { insertAuthenticationNotification } from "@/modules/notifications/infrastructure/AuthenticationNotificationRepository";
import {
  listNotificationEventRuleRecords,
  findNotificationCatalogRecord,
} from "@/modules/notifications/infrastructure/NotificationAdministrationRepository";
import {
  claimDueNotificationOccurrences,
  loadClaimedNotificationDeliveries,
} from "@/modules/notifications/infrastructure/NotificationDispatchRepository";
import { consumeAuthEmailRateLimit } from "@/modules/users/infrastructure/AuthEmailRateLimitRepository";

const enabled = process.env.RUN_AUTH_EMAIL_DATABASE_TESTS === "true";
const describeDatabase = enabled ? describe : describe.skip;
const pool = enabled
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL })
  : null;
async function query(text: string, values: unknown[] = []) {
  if (!pool) throw new Error("Authentication test database is unavailable.");
  return pool.query(text, values);
}
beforeAll(async () => {
  if (!enabled) return;
  await seedInitialNotificationConfiguration();
});
beforeEach(async () => {
  if (!enabled) return;
  await query("DELETE FROM app_notification_deliveries");
  await query("DELETE FROM app_notification_outbox");
  await query("DELETE FROM app_auth_email_rate_limits");
  await query("UPDATE app_notification_channels SET is_enabled = true");
});
afterAll(async () => {
  await pool?.end();
  const databaseGlobal = globalThis as typeof globalThis & {
    smeFundPool?: pg.Pool;
  };
  await databaseGlobal.smeFundPool?.end();
});

describeDatabase("authentication notification PostgreSQL persistence", () => {
  it("migrates the Authentication catalogue and keeps seed replay idempotent", async () => {
    const repeated = await seedInitialNotificationConfiguration();
    expect(repeated.createdEventKeys).toEqual([]);
    expect(repeated.createdRuleCount).toBe(0);
    const catalog = await findNotificationCatalogRecord("AUTHENTICATION");
    expect(catalog?.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventKey: "auth.email.verification",
          ruleEligibility: "SYSTEM_ONLY",
        }),
        expect.objectContaining({
          eventKey: "auth.password.reset",
          ruleEligibility: "SYSTEM_ONLY",
        }),
      ]),
    );
    expect(
      await listNotificationEventRuleRecords({ catalogKey: "AUTHENTICATION" }),
    ).toEqual([]);
    const configurableRules = await listNotificationEventRuleRecords({});
    expect(
      configurableRules.some(
        (rule) => rule.eventKey === "application.submitted",
      ),
    ).toBe(true);
    expect(
      configurableRules.every(
        (rule) => rule.ruleEligibility === "CONFIGURABLE",
      ),
    ).toBe(true);
  });

  it("rejects direct database rules for a system-only event", async () => {
    await expect(
      query(`INSERT INTO app_notification_event_rules (event_id, description)
      SELECT id, 'Unauthorized rule' FROM app_notification_events
      WHERE event_key = 'auth.password.reset'`),
    ).rejects.toThrow("System-only events cannot have notification rules");
  });

  it("atomically captures one fixed recipient without storing an action code", async () => {
    await insertAuthenticationNotification(
      "auth.password.reset",
      {
        firebaseUid: "firebase-owner",
        recipientEmail: "owner@example.com",
      },
      "Owner",
    );
    const result =
      await query(`SELECT occurrence.context, delivery.recipient_type,
      delivery.recipient_email, delivery.recipient_user_id
      FROM app_notification_outbox occurrence
      JOIN app_notification_deliveries delivery ON delivery.outbox_id = occurrence.id`);
    expect(result.rows).toEqual([
      {
        context: {
          firebaseUid: "firebase-owner",
          recipientEmail: "owner@example.com",
        },
        recipient_type: "ACCOUNT_HOLDER",
        recipient_email: "owner@example.com",
        recipient_user_id: null,
      },
    ]);
  });

  it("claims system-only email despite disabled channel, event and catalogue flags", async () => {
    await query("UPDATE app_notification_channels SET is_enabled = false");
    await query(
      "UPDATE app_notification_catalogs SET is_enabled = false WHERE catalog_key = 'AUTHENTICATION'",
    );
    await query(
      "UPDATE app_notification_events SET is_enabled = false WHERE rule_eligibility = 'SYSTEM_ONLY'",
    );
    await insertAuthenticationNotification(
      "auth.email.verification",
      { firebaseUid: "owner", recipientEmail: "owner@example.com" },
      "Owner",
    );
    const now = new Date(Date.now() + 1000);
    const claimed = await claimDueNotificationOccurrences({
      batchSize: 25,
      lockTimeoutMs: 300_000,
      now,
      owner: "test-worker",
    });
    expect(claimed).toHaveLength(1);
    const deliveries = await loadClaimedNotificationDeliveries({
      now,
      owner: "test-worker",
      outboxIds: claimed.map((item) => item.id),
    });
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0].recipientEmail).toBe("owner@example.com");
  });

  it("allows one of two concurrent resend requests and reopens an expired window", async () => {
    const results = await Promise.all([
      consumeAuthEmailRateLimit("same-digest", 1),
      consumeAuthEmailRateLimit("same-digest", 1),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    await query(
      "UPDATE app_auth_email_rate_limits SET window_started_at = now() - interval '2 minutes'",
    );
    expect(await consumeAuthEmailRateLimit("same-digest", 1)).toBe(true);
  });
});
