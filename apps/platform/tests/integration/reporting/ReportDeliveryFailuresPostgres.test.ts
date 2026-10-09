import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/platform/database/client", () => ({ getDatabase: vi.fn() }));
vi.mock("@/platform/database/reporting-pool", () => ({
  getReportingPool: vi.fn(),
}));
const adapters = vi.hoisted(() => ({ storage: null as unknown }));
vi.mock("@/integrations/storage/GoogleCloudDocumentStorage", () => ({
  GoogleCloudDocumentStorage: class {
    constructor() {
      return adapters.storage as object;
    }
  },
}));
vi.mock(
  "@/modules/notifications/application/ServerNotificationEmailBranding",
  () => ({
    loadNotificationBrandingLogoAttachment: async () => ({
      cid: "logo",
      content: Buffer.from("logo"),
      contentType: "image/png",
      filename: "logo.png",
    }),
  }),
);
vi.mock(
  "@/modules/notifications/application/ServerNotificationRenderValues",
  () => ({
    buildServerNotificationRenderValues: (
      input: Parameters<typeof buildNotificationRenderValues>[0],
    ) =>
      buildNotificationRenderValues({
        ...input,
        publicApplicationUrl: "https://fund.example",
      }),
  }),
);
import type { AuthenticatedUser } from "@/auth/types";
import { permissionCodes } from "@/auth/authorization/permissions";
import {
  getReportRun,
  runReport,
} from "@/modules/reporting/ServerReportService";
import { processReportGeneration } from "@/modules/reporting/ServerReportGenerationService";
import {
  getReportDeliveryHistory,
  retryReportDelivery,
  getReportDelivery,
  putReportDelivery,
} from "@/modules/reporting/ServerReportDeliveryService";
import { processNotificationBatch } from "@/modules/notifications/application/ServerNotificationDispatchService";
import {
  getNotificationDeliveries,
  retryNotificationDelivery,
} from "@/modules/notifications/application/ServerNotificationAdministrationService";
import { buildNotificationRenderValues } from "@/modules/notifications/domain/NotificationTemplateFields";
import {
  NotificationEmailSendError,
  type NotificationEmailMessage,
} from "@/modules/notifications/application/NotificationEmailSender";
import { notificationErrorCodes } from "@/modules/notifications/domain/NotificationErrors";
import {
  createAutomationReport,
  installAutomationNotifications,
  configureAutomationEvent,
} from "../../support/ReportingAutomationFixture";
import {
  reportingRuntimeDatabaseEnabled as enabled,
  reportingRuntimePool as pool,
  installReportingRuntimeFixture,
  MemoryReportStorage,
} from "../../support/ReportingRuntimeDatabaseFixture";

let actor: AuthenticatedUser;
const storage = new MemoryReportStorage();
const messages: NotificationEmailMessage[] = [];
const failProvider = false;
const historyQuery = {
  page: 1,
  pageSize: 25,
  sortField: "createdAt",
  sortDirection: "desc",
};
async function dispatch() {
  return processNotificationBatch({
    batchSize: 20,
    executionTimeoutMs: 60000,
    lockTimeoutMs: 180000,
    owner: crypto.randomUUID(),
    random: () => 0,
    emailSender: {
      send: async (message) => {
        if (failProvider)
          throw new NotificationEmailSendError(
            notificationErrorCodes.providerUnavailable,
            true,
          );
        messages.push(message);
        return { providerMessageId: `fixture-${messages.length}` };
      },
    },
  });
}
beforeAll(async () => {
  if (enabled) {
    actor = await installReportingRuntimeFixture();
    adapters.storage = storage;
    await installAutomationNotifications(actor);
  }
});
afterAll(async () => {
  await pool.end();
  vi.unstubAllEnvs();
});

(enabled ? describe : describe.skip)(
  "report delivery revocation and attachment failures",
  () => {
    it.each([
      permissionCodes.reportingRunDownloadAll,
      permissionCodes.fundingApplicationAllRead,
    ])(
      "denies revoked %s on send and delivery retry without rerunning SQL",
      async (revokedPermission) => {
        const report = await createAutomationReport(actor);
        await configureAutomationEvent(
          actor,
          report.id,
          "reporting.generation.completed",
        );
        const queued = await runReport(actor, report.id, {
          idempotencyKey: crypto.randomUUID(),
          values: {},
        });
        await processReportGeneration(storage);
        const removed = await pool.query(
          "DELETE FROM app_role_capabilities WHERE capability_id IN (SELECT id FROM app_capabilities WHERE code = $1) RETURNING role_id, capability_id",
          [revokedPermission],
        );
        try {
          expect(await dispatch()).toMatchObject({ failed: 1 });
          const history = await getReportDeliveryHistory(
            actor,
            report.id,
            historyQuery,
          );
          expect(history.items[0]).toMatchObject({
            failureCode: notificationErrorCodes.invalidRecipient,
            status: "FAILED",
          });
          const sourceDenied = {
            ...actor,
            capabilities: new Set([
              permissionCodes.notificationDeliveryRead,
              permissionCodes.notificationDeliveryRetry,
            ]),
          };
          expect(
            await getNotificationDeliveries(
              sourceDenied,
              historyQuery as never,
            ),
          ).toMatchObject({ items: [], total: 0 });
          await expect(
            retryNotificationDelivery(
              sourceDenied,
              history.items[0].deliveryId,
              { reason: "Attempt global history retry" },
              crypto.randomUUID(),
            ),
          ).rejects.toThrow("not found");
          await retryReportDelivery(
            actor,
            report.id,
            history.items[0].deliveryId,
            { reason: "Retry with current grants" },
          );
          expect(await dispatch()).toMatchObject({ failed: 1 });
        } finally {
          for (const row of removed.rows)
            await pool.query(
              "INSERT INTO app_role_capabilities(role_id, capability_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
              [row.role_id, row.capability_id],
            );
        }
        expect(
          (await getReportRun(actor, report.id, queued.id)).run.status,
        ).toBe("SUCCEEDED");
        expect(
          (
            await pool.query(
              "SELECT id FROM app_reporting_report_runs WHERE report_id = $1",
              [report.id],
            )
          ).rowCount,
        ).toBe(1);
      },
    );

    it("records attachment failures separately and rejects cross-report retry scope", async () => {
      const report = await createAutomationReport(actor);
      const other = await createAutomationReport(actor);
      await configureAutomationEvent(
        actor,
        report.id,
        "reporting.generation.completed",
      );
      const queued = await runReport(actor, report.id, {
        idempotencyKey: crypto.randomUUID(),
        values: {},
      });
      await processReportGeneration(storage);
      const detail = await getReportRun(actor, report.id, queued.id);
      const key = detail.artifacts[0].objectKey;
      const original = storage.objects.get(key)!;
      storage.objects.set(key, Buffer.from("corrupt file"));
      expect(await dispatch()).toMatchObject({ failed: 1 });
      const history = await getReportDeliveryHistory(
        actor,
        report.id,
        historyQuery,
      );
      expect(history.items[0].failureCode).toBe(
        notificationErrorCodes.attachmentUnavailable,
      );
      await expect(
        retryReportDelivery(actor, other.id, history.items[0].deliveryId, {
          reason: "Cross-report retry",
        }),
      ).rejects.toThrow("not found");
      storage.objects.set(key, original);
      await retryReportDelivery(actor, report.id, history.items[0].deliveryId, {
        reason: "Attachment restored",
      });
      expect(await dispatch()).toMatchObject({ sent: 1 });
      expect((await getReportRun(actor, report.id, queued.id)).run.status).toBe(
        "SUCCEEDED",
      );
    });

    it("revalidates recipient removal while retaining the captured rule scope", async () => {
      const report = await createAutomationReport(actor);
      await configureAutomationEvent(
        actor,
        report.id,
        "reporting.generation.completed",
      );
      await runReport(actor, report.id, {
        idempotencyKey: crypto.randomUUID(),
        values: {},
      });
      await processReportGeneration(storage);
      const rule = (await getReportDelivery(actor, report.id)).find(
        (rule) => rule?.eventKey === "reporting.generation.completed",
      )!;
      await putReportDelivery(actor, report.id, rule!.eventKey, {
        eventEnabled: true,
        expectedUpdatedAt: rule!.updatedAt,
        isEnabled: false,
        recipients: [
          {
            recipientType: "SPECIFIC_USER",
            targetId: actor.id,
            isRequired: false,
            channelCodes: ["EMAIL"],
          },
        ],
      });
      expect(await dispatch()).toMatchObject({ failed: 1 });
      expect(
        (await getReportDeliveryHistory(actor, report.id, historyQuery))
          .items[0].failureCode,
      ).toBe(notificationErrorCodes.invalidRecipient);
    });
  },
);
