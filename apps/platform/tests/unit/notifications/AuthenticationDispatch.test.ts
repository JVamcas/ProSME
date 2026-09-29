import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/integrations/monitoring/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn() },
}));
vi.mock("@/platform/auth/firebase/ServerAuthEmailService", () => ({
  generateAuthenticationActionUrl: vi
    .fn()
    .mockResolvedValue(
      "https://fund.example/auth/action?mode=resetPassword&oobCode=secure-code",
    ),
  AuthEmailRequestError: class extends Error {},
}));
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
  beginNotificationDeliveryAttempt,
  claimDueNotificationOccurrences,
  loadClaimedNotificationDeliveries,
  recordNotificationDeliverySuccess,
  recordNotificationDeliveryFailure,
  type ClaimedNotificationDelivery,
} from "@/modules/notifications/infrastructure/NotificationDispatchRepository";
import { generateAuthenticationActionUrl } from "@/platform/auth/firebase/ServerAuthEmailService";

const now = new Date("2026-09-29T10:00:00Z");
const delivery: ClaimedNotificationDelivery = {
  attemptCount: 0,
  context: {
    firebaseUid: "firebase-owner",
    recipientEmail: "owner@example.com",
  },
  correlationId: "auth-test",
  deliveryId: "80000000-0000-4000-8000-000000000001",
  outboxId: "80000000-0000-4000-8000-000000000002",
  eventKey: "auth.password.reset",
  htmlTemplate: null,
  plainTextTemplate: null,
  subjectTemplate: null,
  templateVersionId: null,
  recipientEmail: "owner@example.com",
  recipientName: "Owner",
  recipientUserId: null,
};
const send = vi.fn();
async function process() {
  return processNotificationBatch({
    batchSize: 25,
    emailSender: { send },
    executionTimeoutMs: 45_000,
    lockTimeoutMs: 300_000,
    now: () => now,
    owner: "auth-worker",
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(claimDueNotificationOccurrences).mockResolvedValue([
    {
      id: delivery.outboxId,
      eventKey: delivery.eventKey,
      correlationId: "auth-test",
    },
  ]);
  vi.mocked(beginNotificationDeliveryAttempt).mockResolvedValue(1);
  vi.mocked(loadClaimedNotificationDeliveries).mockResolvedValue([delivery]);
  send.mockResolvedValue({ providerMessageId: "message-1" });
});

describe("system-only authentication dispatch", () => {
  it("sends a branded email with no platform user or published template", async () => {
    expect(await process()).toMatchObject({ sent: 1, failed: 0 });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: delivery.recipientEmail,
        html: expect.stringContaining("https://fund.example/auth/action"),
        plainText: expect.stringContaining("oobCode=secure-code"),
      }),
    );
    expect(recordNotificationDeliverySuccess).toHaveBeenCalledWith(
      expect.objectContaining({ templateVersionId: null }),
    );
    expect(
      JSON.stringify(vi.mocked(recordNotificationDeliverySuccess).mock.calls),
    ).not.toContain("secure-code");
  });
  it("honours the editable published event template", async () => {
    vi.mocked(loadClaimedNotificationDeliveries).mockResolvedValue([
      {
        ...delivery,
        templateVersionId: "80000000-0000-4000-8000-000000000003",
        htmlTemplate: '<p>Custom brand</p><a href="{{actionUrl}}">Reset</a>',
        plainTextTemplate: "Custom brand {{actionUrl}}",
        subjectTemplate: "Custom account email",
      },
    ]);
    expect(await process()).toMatchObject({ sent: 1 });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Custom account email",
        html: expect.stringContaining("Custom brand"),
      }),
    );
  });
  it("rejects recipient context mismatches before creating a link", async () => {
    vi.mocked(loadClaimedNotificationDeliveries).mockResolvedValue([
      { ...delivery, recipientEmail: "other@example.com" },
    ]);
    expect(await process()).toMatchObject({ failed: 1 });
    expect(generateAuthenticationActionUrl).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
  it("generates a fresh link on each retry without persisting it", async () => {
    send.mockRejectedValueOnce(new Error("provider unavailable"));
    expect(await process()).toMatchObject({ retrying: 1 });
    expect(recordNotificationDeliveryFailure).toHaveBeenCalledWith(
      expect.objectContaining({ retry: true }),
    );
    expect(await process()).toMatchObject({ sent: 1 });
    expect(generateAuthenticationActionUrl).toHaveBeenCalledTimes(2);
    expect(
      JSON.stringify(vi.mocked(recordNotificationDeliveryFailure).mock.calls),
    ).not.toContain("secure-code");
  });
});
