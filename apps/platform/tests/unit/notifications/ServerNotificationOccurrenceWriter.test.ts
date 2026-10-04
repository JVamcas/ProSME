import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/notifications/infrastructure/NotificationOccurrenceRepository", () => ({
  insertNotificationOccurrence: vi.fn(),
}));

import { captureNotificationOccurrence } from "@/modules/notifications/application/ServerNotificationOccurrenceService";
import { insertNotificationOccurrence } from "@/modules/notifications/infrastructure/NotificationOccurrenceRepository";

const context = {
  applicationId: "10000000-0000-4000-8000-000000000001",
  applicationOwnerUserId: "10000000-0000-4000-8000-000000000002",
  applicationReference: "SME Fund-2026-001",
  correlationId: "submission:SME Fund-2026-001",
  fundingOpportunityTitle: "SME Fund Growth Fund",
  ownerDisplayName: "Applicant One",
  ownerEmail: "Applicant@Example.test",
  sourceIdempotencyKey: "submission-1",
  submittedAt: "2026-09-27T08:00:00.000Z",
  workflowInstanceId: "10000000-0000-4000-8000-000000000003",
};

const input = {
  aggregateId: context.applicationId,
  aggregateType: "APPLICATION",
  context,
  correlationId: context.correlationId,
  eventKey: "application.submitted" as const,
  occurrenceKey: "application:submission-1",
  recipients: [
    {
      displayName: "Applicant One",
      email: "Applicant@Example.test",
      recipientType: "APPLICATION_OWNER",
      resolutionPath: "application.ownerUserId",
      userId: context.applicationOwnerUserId,
    },
    {
      displayName: "Duplicate Snapshot",
      email: "applicant@example.test",
      recipientType: "APPLICATION_OWNER",
      resolutionPath: "application.ownerUserId",
      userId: context.applicationOwnerUserId,
    },
  ],
};

describe("server notification occurrence writer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(insertNotificationOccurrence).mockResolvedValue({
      created: true,
      deliveryCount: 1,
      id: "20000000-0000-4000-8000-000000000001",
      status: "PENDING",
    });
  });

  it("validates and deduplicates recipient snapshots before persistence", async () => {
    await expect(captureNotificationOccurrence({} as never, input))
      .resolves.toMatchObject({ created: true, deliveryCount: 1 });

    expect(insertNotificationOccurrence).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        context,
        recipients: [{
          ...input.recipients[0],
          normalizedEmail: "applicant@example.test",
        }],
      }),
    );
  });

  it("rejects invalid context before any transactional insert", async () => {
    await expect(captureNotificationOccurrence({} as never, {
      ...input,
      context: { ...context, ownerEmail: "not-an-email" },
    })).rejects.toMatchObject({
      code: "NOTIFICATION_INVALID_CONTEXT",
    });
    expect(insertNotificationOccurrence).not.toHaveBeenCalled();
  });

  it("lets event rules select from any approved recipient snapshots", async () => {
    await expect(captureNotificationOccurrence({} as never, {
      ...input,
      recipients: [{
        ...input.recipients[0],
        recipientType: "ASSIGNED_USER",
      }],
    })).resolves.toMatchObject({ created: true });
    expect(insertNotificationOccurrence).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        recipients: [expect.objectContaining({
          recipientType: "ASSIGNED_USER",
        })],
      }),
    );
  });

  it("preserves both relationships when the same user is owner and assignee", async () => {
    await captureNotificationOccurrence({} as never, {
      ...input,
      recipients: [
        input.recipients[0],
        { ...input.recipients[0], recipientType: "ASSIGNED_USER" },
      ],
    });
    expect(insertNotificationOccurrence).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        recipients: [
          expect.objectContaining({ recipientType: "APPLICATION_OWNER" }),
          expect.objectContaining({ recipientType: "ASSIGNED_USER" }),
        ],
      }),
    );
  });

  it("rejects unapproved recipient snapshot fields", async () => {
    await expect(captureNotificationOccurrence({} as never, {
      ...input,
      recipients: [{ ...input.recipients[0], secret: "not-approved" }],
    })).rejects.toMatchObject({ code: "NOTIFICATION_INVALID_RECIPIENT" });
    expect(insertNotificationOccurrence).not.toHaveBeenCalled();
  });
});
