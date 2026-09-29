import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

const database = vi.hoisted(() => ({ execute: vi.fn(), transaction: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ getDatabase: () => database }));
vi.mock("@/platform/auth/firebase/ServerAuthEmailService", () => ({
  generateAuthenticationActionUrl: vi.fn(),
  AuthEmailRequestError: class extends Error {},
}));
import {
  notificationEventCatalogue,
  parseNotificationContext,
} from "@/modules/notifications/domain/NotificationEvent";
import { configurableNotificationEventSeeds } from "@/modules/notifications/domain/NotificationSeedConfiguration";
import { insertAuthenticationNotification } from "@/modules/notifications/infrastructure/AuthenticationNotificationRepository";
import {
  listNotificationEventRuleRecords,
  findNotificationEventRuleRecord,
  updateNotificationEventRuleRecord,
} from "@/modules/notifications/infrastructure/NotificationAdministrationRepository";
import {
  claimDueNotificationOccurrences,
  loadClaimedNotificationDeliveries,
} from "@/modules/notifications/infrastructure/NotificationDispatchRepository";
import { consumeAuthEmailRateLimit } from "@/modules/users/infrastructure/AuthEmailRateLimitRepository";
import { assertAuthenticationTemplate } from "@/modules/notifications/domain/AuthenticationNotificationTemplate";

const dialect = new PgDialect();
const context = {
  firebaseUid: "firebase-owner",
  recipientEmail: "owner@example.com",
};
beforeEach(() => {
  vi.clearAllMocks();
  database.execute.mockResolvedValue({ rows: [{ id: "delivery" }] });
  database.transaction.mockImplementation((callback) => callback(database));
});

describe("system-only authentication events", () => {
  it.each(["auth.email.verification", "auth.password.reset"] as const)(
    "classifies %s independently of its catalogue",
    (key) => {
      expect(notificationEventCatalogue[key]).toMatchObject({
        catalogKey: "AUTHENTICATION",
        ruleEligibility: "SYSTEM_ONLY",
      });
      expect(
        configurableNotificationEventSeeds.some((seed) => seed.key === key),
      ).toBe(false);
      expect(parseNotificationContext(key, context)).toEqual(context);
      expect(() =>
        parseNotificationContext(key, {
          ...context,
          actionUrl: "https://secret",
        }),
      ).toThrow();
    },
  );

  it("creates one fixed recipient and occurrence atomically without storing an action code", async () => {
    await insertAuthenticationNotification(
      "auth.password.reset",
      context,
      "Owner",
    );
    expect(database.transaction).toHaveBeenCalledOnce();
    expect(database.execute).toHaveBeenCalledOnce();
    const query = dialect.sqlToQuery(database.execute.mock.calls[0][0]);
    expect(query.sql).toContain("'ACCOUNT_HOLDER'");
    expect(query.sql).toContain("rule_eligibility = 'SYSTEM_ONLY'");
    expect(query.sql).not.toContain("event_rules");
    expect(query.params).toContain(JSON.stringify(context));
    expect(JSON.stringify(query)).not.toContain("oobCode");
  });

  it("filters rule list and direct rule lookup in SQL", async () => {
    await listNotificationEventRuleRecords({
      catalogKey: "AUTHENTICATION",
      search: "reset",
    });
    await findNotificationEventRuleRecord("auth.password.reset");
    for (const [query] of database.execute.mock.calls) {
      expect(dialect.sqlToQuery(query).sql).toContain(
        "event.rule_eligibility = 'CONFIGURABLE'",
      );
    }
    expect(dialect.sqlToQuery(database.execute.mock.calls[0][0]).sql).toContain(
      "ORDER BY catalog.sort_order",
    );
  });

  it("guards rule writes with database eligibility before changing recipients", async () => {
    database.execute.mockResolvedValue({ rows: [] });
    await updateNotificationEventRuleRecord({
      actorId: "80000000-0000-4000-8000-000000000001",
      eventKey: "auth.password.reset",
      correlationId: "test",
      update: {
        eventEnabled: false,
        isEnabled: false,
        expectedUpdatedAt: "2026-09-29T10:00:00Z",
        recipients: [],
      },
    });
    expect(database.execute).toHaveBeenCalledOnce();
    expect(dialect.sqlToQuery(database.execute.mock.calls[0][0]).sql).toContain(
      "event.rule_eligibility = 'CONFIGURABLE'",
    );
  });

  it("allows system-only delivery even when the email channel is disabled", async () => {
    await claimDueNotificationOccurrences({
      batchSize: 10,
      lockTimeoutMs: 1000,
      now: new Date(),
      owner: "worker",
    });
    await loadClaimedNotificationDeliveries({
      now: new Date(),
      outboxIds: ["80000000-0000-4000-8000-000000000001"],
      owner: "worker",
    });
    for (const [query] of database.execute.mock.calls) {
      expect(dialect.sqlToQuery(query).sql).toContain(
        "rule_eligibility = 'SYSTEM_ONLY'",
      );
    }
    expect(dialect.sqlToQuery(database.execute.mock.calls[1][0]).sql).toContain(
      "OR target.scope IN ('EVENT', 'CATALOG')",
    );
  });

  it("uses an atomic, bounded rate counter with an expiring window", async () => {
    await expect(consumeAuthEmailRateLimit("digest", 1)).resolves.toBe(true);
    const query = dialect.sqlToQuery(database.execute.mock.calls[1][0]);
    expect(query.sql).toContain("ON CONFLICT (key_hash) DO UPDATE");
    expect(query.sql).toContain("interval '1 minute'");
    expect(query.params).toContain(1);
  });

  it("requires the secure action link in both editable template bodies", () => {
    expect(() =>
      assertAuthenticationTemplate({
        htmlTemplate: "<p>No link</p>",
        plainTextTemplate: "{{actionUrl}}",
      }),
    ).toThrow();
    expect(() =>
      assertAuthenticationTemplate({
        htmlTemplate: '<a href="{{actionUrl}}">Verify</a>',
        plainTextTemplate: "No link",
      }),
    ).toThrow();
    expect(() =>
      assertAuthenticationTemplate({
        htmlTemplate: '<a href="{{actionUrl}}">Verify</a>',
        plainTextTemplate: "{{actionUrl}}",
      }),
    ).not.toThrow();
  });
});
