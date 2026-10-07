import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  claim: vi.fn(),
  deliveries: vi.fn(),
  begin: vi.fn(),
  success: vi.fn(),
  failure: vi.fn(),
  finalize: vi.fn(),
  recipient: vi.fn(),
  send: vi.fn(),
}));
vi.mock(
  "@/modules/notifications/infrastructure/NotificationDispatchRepository",
  () => ({
    claimDueNotificationOccurrences: mocks.claim,
    loadClaimedNotificationDeliveries: mocks.deliveries,
    beginNotificationDeliveryAttempt: mocks.begin,
    recordNotificationDeliverySuccess: mocks.success,
    recordNotificationDeliveryFailure: mocks.failure,
    finalizeClaimedNotificationOccurrence: mocks.finalize,
  }),
);
vi.mock(
  "@/modules/notifications/infrastructure/WebsiteReportRecipientRepository",
  () => ({ isCurrentWebsiteReportRecipient: mocks.recipient }),
);
vi.mock(
  "@/modules/notifications/application/ServerNotificationEmailBranding",
  () => ({
    notificationBrandingLogoUrl: "cid:brand",
    loadNotificationBrandingLogoAttachment: vi
      .fn()
      .mockResolvedValue({ filename: "logo.png" }),
  }),
);
vi.mock("@/lib/env/server", () => ({
  getServerEnvironment: () => ({ APP_PUBLIC_URL: "https://example.test" }),
}));
vi.mock("@/integrations/monitoring/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn() },
}));
import { processNotificationBatch } from "@/modules/notifications/application/ServerNotificationDispatchService";
import { websiteReportEmailTemplate } from "@/modules/notifications/domain/WebsiteReportEmailTemplate";

const delivery = {
  ...websiteReportEmailTemplate,
  eventKey: "reporting.website.monthly",
  recipientUserId: "10000000-0000-4000-8000-000000000001",
  recipientName: "Report reader",
  recipientEmail: "reader@example.test",
  attemptCount: 0,
  templateVersionId: "10000000-0000-4000-8000-000000000002",
  deliveryId: "delivery",
  outboxId: "occurrence",
  context: {
    reportId: "10000000-0000-4000-8000-000000000003",
    frequency: "MONTHLY",
    startDate: "2026-09-01",
    endDate: "2026-09-30",
    timezone: "Africa/Windhoek",
    generatedAt: "2026-10-03T07:00:00.000Z",
    reportSummary: "Visitors: 100",
    sourceNotes: "Consenting visitors only.",
  },
};
const dependencies = {
  batchSize: 10,
  executionTimeoutMs: 45000,
  lockTimeoutMs: 120000,
  owner: "test",
  emailSender: { send: mocks.send },
  now: () => new Date("2026-10-07T09:00:00Z"),
  random: () => 0.5,
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.claim.mockResolvedValue([
    { id: "occurrence", eventKey: delivery.eventKey, correlationId: "test" },
  ]);
  mocks.deliveries.mockResolvedValue([delivery]);
  mocks.begin.mockResolvedValue(1);
  mocks.recipient.mockResolvedValue(true);
  mocks.send.mockResolvedValue({ providerMessageId: "receipt" });
});

describe("reporting through the existing notification dispatcher", () => {
  it("delivers matching branded HTML and plain text and records the provider receipt", async () => {
    expect((await processNotificationBatch(dependencies)).sent).toBe(1);
    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "reader@example.test",
        html: expect.stringContaining("Visitors: 100"),
        plainText: expect.stringContaining("Visitors: 100"),
      }),
    );
    expect(mocks.success).toHaveBeenCalledWith(
      expect.objectContaining({
        providerMessageId: "receipt",
        templateVersionId: delivery.templateVersionId,
      }),
    );
  });
  it("blocks revoked access before SMTP and records a stable invalid-recipient failure", async () => {
    mocks.recipient.mockResolvedValue(false);
    expect((await processNotificationBatch(dependencies)).failed).toBe(1);
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.failure).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "NOTIFICATION_INVALID_RECIPIENT",
        retry: false,
      }),
    );
  });
});
