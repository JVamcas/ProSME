import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/notifications/infrastructure/ReportingNotificationRecipientRepository",
  () => ({ reportingRecipientStillBound: vi.fn() }),
);
vi.mock("@/modules/reporting/ServerReportEmailArtifactService", () => ({
  loadReportEmailArtifact: vi.fn(),
  ReportEmailArtifactError: class extends Error {},
}));
import { PermissionDeniedError } from "@/auth/authorization/policy";
import { resolveReportDeliveryAttachments } from "@/modules/notifications/application/ReportDeliveryAttachments";
import { reportingRecipientStillBound } from "@/modules/notifications/infrastructure/ReportingNotificationRecipientRepository";
import { loadReportEmailArtifact } from "@/modules/reporting/ServerReportEmailArtifactService";
import type { ClaimedNotificationDelivery } from "@/modules/notifications/infrastructure/NotificationDispatchRepository";

function delivery(): ClaimedNotificationDelivery {
  const reportId = crypto.randomUUID();
  return {
    reportId,
    ruleId: crypto.randomUUID(),
    recipientUserId: crypto.randomUUID(),
    recipientEmail: "fixture@example.test",
    context: {
      reportId,
      runId: crypto.randomUUID(),
      reportName: "Fixture",
      actorId: crypto.randomUUID(),
      trigger: "SYSTEM",
      timezone: "Africa/Windhoek",
      startDate: "2026-10-01",
      endDate: "2026-10-14",
      occurredAt: "2026-10-17T07:00:00Z",
      rows: 1,
      durationSeconds: 2,
      artifactId: crypto.randomUUID(),
    },
    eventKey: "reporting.generation.completed",
    attemptCount: 0,
    correlationId: "fixture",
    deliveryId: crypto.randomUUID(),
    outboxId: crypto.randomUUID(),
    htmlTemplate: "<p>Fixture</p>",
    plainTextTemplate: "Fixture",
    subjectTemplate: "Fixture",
    recipientName: "Fixture",
    templateVersionId: crypto.randomUUID(),
  };
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(reportingRecipientStillBound).mockResolvedValue(true);
  vi.mocked(loadReportEmailArtifact).mockResolvedValue([]);
});
describe("report attachment scope validation", () => {
  it("rejects report context that disagrees with the captured occurrence scope", async () => {
    const item = delivery();
    item.reportId = crypto.randomUUID();
    await expect(resolveReportDeliveryAttachments(item)).rejects.toMatchObject({
      code: "NOTIFICATION_INVALID_CONTEXT",
      retryable: false,
    });
    expect(loadReportEmailArtifact).not.toHaveBeenCalled();
  });
  it("rejects a removed recipient before private storage access", async () => {
    vi.mocked(reportingRecipientStillBound).mockResolvedValue(false);
    await expect(
      resolveReportDeliveryAttachments(delivery()),
    ).rejects.toMatchObject({
      code: "NOTIFICATION_INVALID_RECIPIENT",
      retryable: false,
    });
    expect(loadReportEmailArtifact).not.toHaveBeenCalled();
  });
  it("maps source permission revocation to a visible terminal delivery failure", async () => {
    vi.mocked(loadReportEmailArtifact).mockRejectedValue(
      new PermissionDeniedError("source.read"),
    );
    await expect(
      resolveReportDeliveryAttachments(delivery()),
    ).rejects.toMatchObject({
      code: "NOTIFICATION_INVALID_RECIPIENT",
      retryable: false,
    });
  });
  it("retries private storage outages without invoking generation", async () => {
    vi.mocked(loadReportEmailArtifact).mockRejectedValue(
      new Error("private provider details"),
    );
    await expect(
      resolveReportDeliveryAttachments(delivery()),
    ).rejects.toMatchObject({
      code: "NOTIFICATION_ATTACHMENT_UNAVAILABLE",
      retryable: true,
    });
  });
});
