import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));
vi.mock("@/platform/database/reporting-pool", () => ({
  getReportingPool: vi.fn(),
}));
import type { AuthenticatedUser } from "@/auth/types";
import { permissionCodes as p } from "@/auth/authorization/permissions";
import {
  getNotificationEventRules,
  getNotificationEventRule,
  updateNotificationEventRule,
} from "@/modules/notifications/application/ServerNotificationAdministrationService";
import {
  getReportDelivery,
  getReportDeliveryOverview,
} from "@/modules/reporting/ServerReportDeliveryService";
import {
  createAutomationReport,
  installAutomationNotifications,
} from "../../support/ReportingAutomationFixture";
import {
  reportingRuntimeDatabaseEnabled as enabled,
  reportingRuntimePool as pool,
  installReportingRuntimeFixture,
} from "../../support/ReportingRuntimeDatabaseFixture";

let actor: AuthenticatedUser;
beforeAll(async () => {
  if (enabled) {
    const principal = await installReportingRuntimeFixture();
    actor = {
      ...principal,
      capabilities: new Set([
        ...principal.capabilities,
        p.notificationConfigurationRead,
        p.notificationConfigurationUpdate,
      ]),
    };
    await installAutomationNotifications(actor);
  }
});
afterAll(async () => {
  await pool.end();
  vi.unstubAllEnvs();
});
(enabled ? describe : describe.skip)(
  "report subscriptions in Event Rules",
  () => {
    it("lists three scoped rules per report and edits the authoritative rule from Event Rules", async () => {
      const first = await createAutomationReport(actor);
      const second = await createAutomationReport(actor);
      const rows = await getNotificationEventRules(actor, {
        reportId: first.id,
      });
      expect(rows).toHaveLength(3);
      const overview = await getReportDeliveryOverview(actor, first.id);
      expect(overview).toHaveLength(3);
      expect(overview.every((rule) => !("recipientOptions" in rule))).toBe(
        true,
      );
      expect(
        rows.every(
          (row) => row.reportId === first.id && row.reportName === first.name,
        ),
      ).toBe(true);
      const key = "reporting.generation.completed";
      const firstRule = await getNotificationEventRule(actor, key, first.id);
      await updateNotificationEventRule(
        actor,
        key,
        {
          expectedUpdatedAt: firstRule.updatedAt as string,
          eventEnabled: true,
          isEnabled: true,
          recipients: [
            {
              recipientType: "SPECIFIC_USER",
              targetId: actor.id,
              isRequired: false,
              channelCodes: ["EMAIL"],
            },
          ],
        },
        crypto.randomUUID(),
        first.id,
      );
      expect(
        (await getReportDelivery(actor, first.id)).find(
          (rule) => rule?.eventKey === key,
        ),
      ).toMatchObject({
        isEnabled: true,
        recipients: [{ targetId: actor.id }],
      });
      expect(
        (await getNotificationEventRule(actor, key, second.id)).isEnabled,
      ).toBe(false);
      expect(
        (await getNotificationEventRule(actor, "application.submitted"))
          .reportId,
      ).toBeNull();
      await expect(getNotificationEventRule(actor, key)).rejects.toThrow(
        "not found",
      );
      const updated = await getNotificationEventRule(actor, key, first.id);
      await expect(
        updateNotificationEventRule(
          actor,
          key,
          {
            expectedUpdatedAt: firstRule.updatedAt as string,
            eventEnabled: true,
            isEnabled: false,
            recipients: updated.recipients as never,
          },
          crypto.randomUUID(),
          first.id,
        ),
      ).rejects.toThrow();
    });
    it("denies editing without the report delivery permission and hides source-inaccessible scope rows", async () => {
      const report = await createAutomationReport(actor);
      const restricted = {
        ...actor,
        capabilities: new Set(
          [...actor.capabilities].filter(
            (code) => code !== p.reportingDeliveryUpdateAll,
          ),
        ),
      };
      const rule = await getNotificationEventRule(
        actor,
        "reporting.generation.completed",
        report.id,
      );
      await expect(
        updateNotificationEventRule(
          restricted,
          "reporting.generation.completed",
          {
            eventEnabled: true,
            expectedUpdatedAt: rule.updatedAt as string,
            isEnabled: true,
            recipients: [
              {
                recipientType: "SPECIFIC_USER",
                targetId: actor.id,
                isRequired: false,
                channelCodes: ["EMAIL"],
              },
            ],
          },
          crypto.randomUUID(),
          report.id,
        ),
      ).rejects.toThrow("reporting.delivery.update.all");
      const sourceDenied = {
        ...actor,
        capabilities: new Set([
          p.notificationConfigurationRead,
          p.reportingReportReadAll,
          p.reportingDatasetReadAll,
        ]),
      };
      await expect(
        getNotificationEventRules(sourceDenied, { reportId: report.id }),
      ).rejects.toThrow();
      const visible = await getNotificationEventRules(sourceDenied);
      expect(visible.every((row) => row.reportId === null)).toBe(true);
    });
  },
);
