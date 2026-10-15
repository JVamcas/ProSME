import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env/server", () => ({
  getServerEnvironment: () => ({ APP_PUBLIC_URL: "https://fund.example" }),
}));
vi.mock("@/integrations/monitoring/logger", () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));
vi.mock("@/modules/notifications/application/ServerEventEmailService", () => ({
  prepareEventEmailDeliveries: vi.fn(),
  renderEventEmail: vi.fn(),
  dispatchCurrentEventEmail: vi.fn(),
}));
vi.mock(
  "@/modules/notifications/application/ServerNotificationEmailBranding",
  () => ({
    notificationBrandingLogoUrl: "cid:sme-fund-branding-logo",
    loadNotificationBrandingLogoAttachment: vi
      .fn()
      .mockResolvedValue({
        filename: "logo.png",
        content: Buffer.from("logo"),
        cid: "sme-fund-branding-logo",
        contentType: "image/png",
      }),
  }),
);
vi.mock(
  "@/modules/notifications/application/ReportDeliveryAttachments",
  () => ({ resolveReportDeliveryAttachments: vi.fn().mockResolvedValue([]) }),
);
vi.mock(
  "@/modules/notifications/infrastructure/NotificationDispatchRepository",
  () => ({
    beginNotificationDeliveryAttempt: vi.fn().mockResolvedValue(1),
    claimDueNotificationOccurrences: vi
      .fn()
      .mockResolvedValue([{ id: "occurrence" }]),
    finalizeClaimedNotificationOccurrence: vi.fn(),
    loadClaimedNotificationDeliveries: vi.fn(),
    recordNotificationDeliveryFailure: vi.fn(),
    recordNotificationDeliverySuccess: vi.fn(),
  }),
);
import { processNotificationBatch } from "@/modules/notifications/application/ServerNotificationDispatchService";
import {
  loadClaimedNotificationDeliveries,
  recordNotificationDeliverySuccess,
} from "@/modules/notifications/infrastructure/NotificationDispatchRepository";
const context = {
  appealId: "a1111111-1111-4111-8111-111111111111",
  appealReference: "APL-000001",
  applicationId: "a2222222-2222-4222-8222-222222222222",
  applicationReference: "CALL-2026-000001",
  occurredAt: "2026-10-15T10:00:00.000Z",
};
describe("application appeal acknowledgement dispatcher", () => {
  it("sends branded acknowledgement without a platform account or Firebase action", async () => {
    vi.mocked(loadClaimedNotificationDeliveries).mockResolvedValue([
      {
        attemptCount: 0,
        context,
        correlationId: context.appealId,
        deliveryId: "delivery",
        outboxId: "occurrence",
        eventKey: "application.appeal.acknowledged",
        recipientEmail: "sender@example.test",
        recipientName: "Appeal sender",
        recipientUserId: null,
        htmlTemplate: null,
        plainTextTemplate: null,
        subjectTemplate: null,
        templateVersionId: null,
      },
    ]);
    const send = vi
      .fn()
      .mockResolvedValue({ providerMessageId: "test-provider-message" });
    const result = await processNotificationBatch({
      batchSize: 5,
      executionTimeoutMs: 30_000,
      lockTimeoutMs: 60_000,
      emailSender: { send },
      owner: "appeal-dispatch-test",
    });
    expect(result.sent).toBe(1);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "sender@example.test",
        subject: "Appeal received: APL-000001",
        html: expect.stringContaining("Your appeal has been received"),
        attachments: expect.arrayContaining([
          expect.objectContaining({ cid: "sme-fund-branding-logo" }),
        ]),
      }),
    );
    expect(recordNotificationDeliverySuccess).toHaveBeenCalled();
  });
});
