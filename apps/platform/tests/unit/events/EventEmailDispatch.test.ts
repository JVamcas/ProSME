import { beforeEach, describe, expect, it, vi } from "vitest";
import { applicationDelivery } from "../notifications/NotificationDispatchFixtures";

const fixture = vi.hoisted(() => ({ current: true }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env/server", () => ({
  getServerEnvironment: () => ({ APP_PUBLIC_URL: "https://fund.example" }),
}));
vi.mock(
  "@/modules/notifications/infrastructure/EventEmailDeliveryRepository",
  () => ({
    prepareEventEmailDeliveries: vi.fn(),
    withCurrentEventDelivery: (_id: string, operation: () => unknown) =>
      fixture.current ? operation() : null,
  }),
);
vi.mock("@/integrations/monitoring/logger", () => ({
  logger: { warn: vi.fn() },
}));
vi.mock(
  "@/modules/notifications/application/ServerNotificationEmailBranding",
  () => ({
    notificationBrandingLogoUrl: "cid:sme-fund-branding-logo",
    loadNotificationBrandingLogoAttachment: vi
      .fn()
      .mockResolvedValue({ cid: "sme-fund-branding-logo" }),
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
import { processNotificationBatch } from "@/modules/notifications/application/ServerNotificationDispatchService";
import {
  NotificationEmailSendError,
  type NotificationEmailSender,
} from "@/modules/notifications/application/NotificationEmailSender";
import { notificationErrorCodes } from "@/modules/notifications/domain/NotificationErrors";
import * as repository from "@/modules/notifications/infrastructure/NotificationDispatchRepository";

const now = new Date("2026-10-12T08:00:00Z");
function eventDelivery(reminder = false) {
  return applicationDelivery({
    eventKey: reminder
      ? "event.registration.reminder"
      : "event.registration.confirmed",
    context: {
      eventId: 42,
      registrationId: "80000000-0000-4000-8000-000000000001",
      title: "Synthetic session",
      slug: "synthetic-session",
      startsAt: "2026-11-12T08:00:00Z",
      endsAt: "2026-11-12T10:00:00Z",
      timezone: "Africa/Windhoek",
      location: "Windhoek",
    },
    recipientUserId: null,
    htmlTemplate: null,
    plainTextTemplate: null,
    subjectTemplate: null,
    templateVersionId: null,
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  fixture.current = true;
  vi.mocked(repository.beginNotificationDeliveryAttempt).mockResolvedValue(1);
  vi.mocked(repository.claimDueNotificationOccurrences).mockResolvedValue([
    {
      id: eventDelivery().outboxId,
      eventKey: "event.registration.confirmed",
      correlationId: "synthetic",
    },
  ]);
  vi.mocked(repository.loadClaimedNotificationDeliveries).mockResolvedValue([
    eventDelivery(),
  ]);
});
function run(send: NotificationEmailSender["send"]) {
  return processNotificationBatch({
    batchSize: 10,
    emailSender: { send },
    executionTimeoutMs: 5000,
    lockTimeoutMs: 10000,
    now: () => now,
    random: () => 0,
    owner: "synthetic",
  });
}
describe("Event email delivery through the notification engine", () => {
  it.each([false, true])(
    "sends confirmation/reminder using the event timezone and public link, without an account",
    async (reminder) => {
      vi.mocked(repository.loadClaimedNotificationDeliveries).mockResolvedValue(
        [eventDelivery(reminder)],
      );
      const send = vi
        .fn()
        .mockResolvedValue({ providerMessageId: "synthetic-message" });
      expect(await run(send)).toMatchObject({ sent: 1, failed: 0 });
      const message = send.mock.calls[0][0];
      expect(message.subject).toContain(
        reminder ? "Reminder" : "Registration confirmed",
      );
      expect(message.html).toContain("Synthetic session");
      expect(message.html).toContain("10:00");
      expect(message.html).toContain("Africa/Windhoek");
      expect(message.html).toContain(
        "https://fund.example/events/synthetic-session",
      );
      expect(repository.recordNotificationDeliverySuccess).toHaveBeenCalledWith(
        expect.objectContaining({ providerMessageId: "synthetic-message" }),
      );
    },
  );
  it("blocks the SMTP call and attempt when the published event is stale", async () => {
    fixture.current = false;
    const send = vi.fn();
    await run(send);
    expect(send).not.toHaveBeenCalled();
    expect(repository.beginNotificationDeliveryAttempt).not.toHaveBeenCalled();
  });
  it("uses the existing retry policy for provider failures", async () => {
    const send = vi
      .fn()
      .mockRejectedValue(
        new NotificationEmailSendError(
          notificationErrorCodes.providerUnavailable,
          true,
        ),
      );
    expect(await run(send)).toMatchObject({ retrying: 1 });
    expect(repository.recordNotificationDeliveryFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        retry: true,
        deliveryId: eventDelivery().deliveryId,
      }),
    );
  });
});
