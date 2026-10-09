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
import {
  getReportRun,
  runReport,
} from "@/modules/reporting/ServerReportService";
import { processReportGeneration } from "@/modules/reporting/ServerReportGenerationService";
import { getReportDeliveryHistory } from "@/modules/reporting/ServerReportDeliveryService";
import { processNotificationBatch } from "@/modules/notifications/application/ServerNotificationDispatchService";
import { buildNotificationRenderValues } from "@/modules/notifications/domain/NotificationTemplateFields";
import {
  NotificationEmailSendError,
  type NotificationEmailMessage,
} from "@/modules/notifications/application/NotificationEmailSender";
import { notificationErrorCodes } from "@/modules/notifications/domain/NotificationErrors";
import { findNotificationEventRuleRecord } from "@/modules/notifications/infrastructure/NotificationAdministrationRepository";
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
let failProvider = false;
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
  "report lifecycle delivery with saved attachments",
  () => {
    it("isolates two reports using the same event and retains global notification lookup", async () => {
      const first = await createAutomationReport(actor);
      const second = await createAutomationReport(actor);
      await configureAutomationEvent(
        actor,
        first.id,
        "reporting.generation.completed",
      );
      const global = await findNotificationEventRuleRecord(
        "application.submitted",
      );
      expect(global).toMatchObject({
        eventKey: "application.submitted",
        catalogKey: "APPLICATIONS",
      });
      const queuedFirst = await runReport(actor, first.id, {
        idempotencyKey: crypto.randomUUID(),
        values: {},
      });
      const queuedSecond = await runReport(actor, second.id, {
        idempotencyKey: crypto.randomUUID(),
        values: {},
      });
      await processReportGeneration(storage);
      await processReportGeneration(storage);
      const before = messages.length;
      expect(await dispatch()).toMatchObject({ sent: 1 });
      expect(messages).toHaveLength(before + 1);
      expect(messages.at(-1)?.subject).toBe(`Report generated: ${first.name}`);
      const detail = await getReportRun(actor, first.id, queuedFirst.id);
      const attachment = messages
        .at(-1)!
        .attachments!.find((item) => !item.cid)!;
      expect(attachment.filename).toBe(detail.artifacts[0].filename);
      expect(attachment.content).toEqual(
        await storage.read(detail.artifacts[0].objectKey),
      );
      expect(attachment.content.toString()).toContain("Submitted business");
      expect(
        (await getReportRun(actor, second.id, queuedSecond.id)).run.status,
      ).toBe("SUCCEEDED");
      expect(
        (await getReportDeliveryHistory(actor, second.id, historyQuery)).total,
      ).toBe(0);
      const occurrence = (
        await pool.query(
          "SELECT rule_id, report_id, context FROM app_notification_outbox WHERE aggregate_id = $1 AND event_key = 'reporting.generation.completed'",
          [queuedFirst.id],
        )
      ).rows[0];
      expect(occurrence.report_id).toBe(first.id);
      expect(occurrence.context.artifactId).toBe(detail.artifacts[0].id);
      expect(occurrence.rule_id).toBeTruthy();
    });

    it("retries provider failures using the same file and captured email-template version", async () => {
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
      failProvider = true;
      expect(await dispatch()).toMatchObject({ retrying: 1 });
      failProvider = false;
      const captured = (
        await pool.query(
          "SELECT template_version_id FROM app_notification_deliveries delivery JOIN app_notification_outbox occurrence ON occurrence.id = delivery.outbox_id WHERE occurrence.report_id = $1",
          [report.id],
        )
      ).rows[0].template_version_id;
      expect(captured).toBeTruthy();
      // Retired versions remain the captured version for existing reporting occurrences.
      await pool.query(
        "UPDATE app_notification_template_versions SET status = 'RETIRED' WHERE id = $1",
        [captured],
      );
      await pool.query(
        "UPDATE app_notification_deliveries SET next_attempt_at = now() WHERE outbox_id IN (SELECT id FROM app_notification_outbox WHERE report_id = $1)",
        [report.id],
      );
      await pool.query(
        "UPDATE app_notification_outbox SET available_at = now() WHERE report_id = $1",
        [report.id],
      );
      expect(await dispatch()).toMatchObject({ sent: 1 });
      expect(
        (await getReportRun(actor, report.id, queued.id)).events,
      ).toHaveLength(2);
      expect(
        (
          await pool.query(
            "SELECT id FROM app_reporting_report_runs WHERE report_id = $1",
            [report.id],
          )
        ).rowCount,
      ).toBe(1);
      await pool.query(
        "UPDATE app_notification_template_versions SET status = 'PUBLISHED' WHERE id = $1",
        [captured],
      );
    });

    it("sends started without output and failed with the saved sanitized error file", async () => {
      const report = await createAutomationReport(actor);
      await configureAutomationEvent(
        actor,
        report.id,
        "reporting.generation.started",
      );
      await configureAutomationEvent(
        actor,
        report.id,
        "reporting.generation.failed",
      );
      const queued = await runReport(actor, report.id, {
        idempotencyKey: crypto.randomUUID(),
        values: {},
      });
      storage.failWrites = true;
      await processReportGeneration(storage);
      expect(
        (await getReportRun(actor, report.id, queued.id)).artifacts,
      ).toEqual([]);
      storage.failWrites = false;
      await processReportGeneration(storage);
      const detail = await getReportRun(actor, report.id, queued.id);
      expect(detail.run.status).toBe("FAILED");
      expect(detail.artifacts[0].kind).toBe("ERROR");
      const before = messages.length;
      expect(await dispatch()).toMatchObject({ sent: 2 });
      const sent = messages.slice(before);
      expect(
        sent
          .find((message) => message.subject.includes("started"))
          ?.attachments?.filter((item) => !item.cid),
      ).toEqual([]);
      const failureMessage = sent.find((message) =>
        message.subject.includes("failed"),
      );
      expect(failureMessage).toBeDefined();
      const error = failureMessage!.attachments!.find((item) => !item.cid)!;
      expect(error.content).toEqual(
        await storage.read(detail.artifacts[0].objectKey),
      );
      expect(error.content.toString()).not.toContain(
        "Sensitive storage credentials",
      );
    });
  },
);
