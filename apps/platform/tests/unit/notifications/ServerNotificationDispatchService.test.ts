import {
  applicationDelivery,
  workflowDelivery,
} from "./NotificationDispatchFixtures";
vi.mock("@/modules/notifications/application/ServerEventEmailService", () => ({
  prepareEventEmailDeliveries: vi.fn(),
  renderEventEmail: vi.fn(),
  dispatchCurrentEventEmail: vi.fn(),
}));
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/integrations/monitoring/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock(
  "@/modules/notifications/application/ServerNotificationEmailBranding",
  () => ({
    loadNotificationBrandingLogoAttachment: vi.fn().mockResolvedValue({
      cid: "sme-fund-branding-logo",
      content: Buffer.from("logo"),
      contentType: "image/png",
      filename: "sme-fund-logo.png",
    }),
  }),
);
vi.mock(
  "@/modules/notifications/application/ServerNotificationRenderValues",
  () => ({
    buildServerNotificationRenderValues: vi.fn(({ recipient }) => ({
      applicationReference: "SME Fund-1",
      assignedAt: "27 Sep 2026",
      fundingOpportunityTitle: "Growth Fund",
      platformName: "SME Fund Namibia",
      recipientName: recipient.displayName,
      stageName: "Assessment",
      submittedAt: "27 Sep 2026",
      taskSummary: "Review",
      workQueueUrl: "https://fund.example/admin/work-queue",
    })),
  }),
);
vi.mock(
  "@/modules/notifications/infrastructure/NotificationDispatchRepository",
  () => ({
    beginNotificationDeliveryAttempt: vi.fn(),
    claimDueNotificationOccurrences: vi.fn(),
    finalizeClaimedNotificationOccurrence: vi.fn(),
    loadClaimedNotificationDeliveries: vi.fn(),
    recordNotificationDeliveryFailure: vi.fn(),
    recordNotificationDeliverySuccess: vi.fn(),
  }),
);

import {
  NotificationEmailSendError,
  type NotificationEmailSender,
} from "@/modules/notifications/application/NotificationEmailSender";
import { processNotificationBatch } from "@/modules/notifications/application/ServerNotificationDispatchService";
import {
  beginNotificationDeliveryAttempt,
  claimDueNotificationOccurrences,
  finalizeClaimedNotificationOccurrence,
  loadClaimedNotificationDeliveries,
  recordNotificationDeliveryFailure,
  recordNotificationDeliverySuccess,
} from "@/modules/notifications/infrastructure/NotificationDispatchRepository";

const now = new Date("2026-09-27T10:00:00.000Z");
function sender(
  send = vi.fn().mockResolvedValue({ providerMessageId: "message-1" }),
) {
  return { send } satisfies NotificationEmailSender;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(claimDueNotificationOccurrences).mockResolvedValue([
    {
      correlationId: "correlation-1",
      eventKey: "application.submitted",
      id: applicationDelivery().outboxId,
    },
  ]);
  vi.mocked(loadClaimedNotificationDeliveries).mockResolvedValue([
    applicationDelivery(),
  ]);
  vi.mocked(beginNotificationDeliveryAttempt).mockResolvedValue(1);
  vi.mocked(finalizeClaimedNotificationOccurrence).mockResolvedValue(undefined);
});

describe("notification dispatch service", () => {
  it("processes both initial event types end-to-end through a fake sender", async () => {
    const deliveries = [applicationDelivery(), workflowDelivery()];
    vi.mocked(claimDueNotificationOccurrences).mockResolvedValue(
      deliveries.map((delivery) => ({
        correlationId: delivery.correlationId,
        eventKey: delivery.eventKey,
        id: delivery.outboxId,
      })),
    );
    vi.mocked(loadClaimedNotificationDeliveries).mockResolvedValue(deliveries);
    const fakeSender = sender();

    await expect(
      processNotificationBatch({
        batchSize: 25,
        emailSender: fakeSender,
        executionTimeoutMs: 45_000,
        lockTimeoutMs: 300_000,
        now: () => now,
        owner: "processor-1",
        random: () => 0.5,
      }),
    ).resolves.toEqual({
      claimed: 2,
      failed: 0,
      processed: 2,
      retrying: 0,
      sent: 2,
    });
    expect(fakeSender.send).toHaveBeenCalledTimes(2);
    expect(recordNotificationDeliverySuccess).toHaveBeenCalledTimes(2);
    expect(finalizeClaimedNotificationOccurrence).toHaveBeenCalledTimes(2);
  });

  it("preserves success when another recipient fails terminally", async () => {
    const deliveries = [
      applicationDelivery(),
      applicationDelivery({
        deliveryId: "81000000-0000-4000-8000-000000000009",
        recipientEmail: "invalid@example.com",
      }),
    ];
    vi.mocked(loadClaimedNotificationDeliveries).mockResolvedValue(deliveries);
    const send = vi
      .fn()
      .mockResolvedValueOnce({ providerMessageId: "message-1" })
      .mockRejectedValueOnce(
        new NotificationEmailSendError(
          "NOTIFICATION_PROVIDER_INVALID_ADDRESS",
          false,
        ),
      );

    const result = await processNotificationBatch({
      batchSize: 25,
      emailSender: sender(send),
      executionTimeoutMs: 45_000,
      lockTimeoutMs: 300_000,
      now: () => now,
      owner: "processor-1",
      random: () => 0.5,
    });
    expect(result).toMatchObject({ failed: 1, sent: 1 });
    expect(recordNotificationDeliverySuccess).toHaveBeenCalledTimes(1);
    expect(recordNotificationDeliveryFailure).toHaveBeenCalledWith(
      expect.objectContaining({ retry: false }),
    );
  });

  it("schedules a transient failure and stops retrying at the fifth attempt", async () => {
    const failingSender = sender(
      vi
        .fn()
        .mockRejectedValue(
          new NotificationEmailSendError("NOTIFICATION_PROVIDER_TIMEOUT", true),
        ),
    );
    await processNotificationBatch({
      batchSize: 25,
      emailSender: failingSender,
      executionTimeoutMs: 45_000,
      lockTimeoutMs: 300_000,
      now: () => now,
      owner: "processor-1",
      random: () => 0.5,
    });
    expect(recordNotificationDeliveryFailure).toHaveBeenLastCalledWith(
      expect.objectContaining({
        code: "NOTIFICATION_PROVIDER_TIMEOUT",
        retry: true,
      }),
    );

    vi.mocked(beginNotificationDeliveryAttempt).mockResolvedValue(5);
    await processNotificationBatch({
      batchSize: 25,
      emailSender: failingSender,
      executionTimeoutMs: 45_000,
      lockTimeoutMs: 300_000,
      now: () => now,
      owner: "processor-2",
      random: () => 0.5,
    });
    expect(recordNotificationDeliveryFailure).toHaveBeenLastCalledWith(
      expect.objectContaining({
        code: "NOTIFICATION_RETRY_EXHAUSTED",
        deadLetter: true,
        retry: false,
      }),
    );
  });

  it("records a missing published template without calling the sender", async () => {
    vi.mocked(loadClaimedNotificationDeliveries).mockResolvedValue([
      applicationDelivery({
        htmlTemplate: null,
        plainTextTemplate: null,
        subjectTemplate: null,
        templateVersionId: null,
      }),
    ]);
    const fakeSender = sender();
    const result = await processNotificationBatch({
      batchSize: 25,
      emailSender: fakeSender,
      executionTimeoutMs: 45_000,
      lockTimeoutMs: 300_000,
      now: () => now,
      owner: "processor-1",
      random: () => 0.5,
    });
    expect(result).toMatchObject({ failed: 1, sent: 0 });
    expect(fakeSender.send).not.toHaveBeenCalled();
    expect(recordNotificationDeliveryFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "NOTIFICATION_TEMPLATE_UNAVAILABLE",
        retry: false,
      }),
    );
  });
});
