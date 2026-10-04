import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/notifications/application/ServerNotificationOccurrenceService", () => ({
  captureNotificationOccurrence: vi.fn(),
}));
vi.mock("@/modules/workflows/infrastructure/WorkflowRfiNotificationRepository", () => ({
  loadWorkflowRfiNotificationSource: vi.fn(),
}));
vi.mock("@/modules/workflows/infrastructure/WorkflowDeadlineNotificationRepository", () => ({
  loadWorkflowDeadlineNotificationSnapshot: vi.fn(),
}));

import { captureNotificationOccurrence } from "@/modules/notifications/application/ServerNotificationOccurrenceService";
import { parseNotificationContext } from "@/modules/notifications/domain/NotificationEvent";
import {
  captureWorkflowRfiCreatedNotification,
  captureWorkflowRfiLifecycleNotification,
} from "@/modules/workflows/application/runtime/ServerWorkflowRfiNotificationService";
import { loadWorkflowDeadlineNotificationSnapshot } from "@/modules/workflows/infrastructure/WorkflowDeadlineNotificationRepository";
import { loadWorkflowRfiNotificationSource } from "@/modules/workflows/infrastructure/WorkflowRfiNotificationRepository";

const applicationId = "10000000-0000-4000-8000-000000000001";
const requestInformationId = "20000000-0000-4000-8000-000000000001";
const stageInstanceId = "30000000-0000-4000-8000-000000000001";
const workflowInstanceId = "40000000-0000-4000-8000-000000000001";
const owner = {
  displayName: "Applicant",
  email: "applicant@example.test",
  userId: "50000000-0000-4000-8000-000000000001",
};
const assignee = {
  displayName: "Reviewer",
  email: "reviewer@example.test",
  userId: "60000000-0000-4000-8000-000000000001",
};
const source = {
  applicationId,
  closedAt: new Date("2026-10-05T09:00:00.000Z"),
  correlationId: "rfi-correlation",
  createdAt: new Date("2026-10-03T09:00:00.000Z"),
  deadlineAt: new Date("2026-10-13T09:00:00.000Z"),
  idempotencyKey: "rfi-command",
  question: "Please clarify your turnover.",
  recipientUserId: owner.userId,
  respondedAt: new Date("2026-10-04T09:00:00.000Z"),
  stageInstanceId,
  workflowInstanceId,
};
const snapshot = {
  applicationId,
  applicationReference: "FUND-2026-00016",
  assignees: [assignee],
  fundingOpportunityTitle: "SME funding call",
  owner,
  stageName: "Screening",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(loadWorkflowRfiNotificationSource).mockResolvedValue(source);
  vi.mocked(loadWorkflowDeadlineNotificationSnapshot).mockResolvedValue(snapshot);
});

describe("information request creation notifications", () => {
  it.each(["responded", "closed"] as const)("captures the %s lifecycle event", async (event) => {
    await captureWorkflowRfiLifecycleNotification(
      {} as never,
      requestInformationId,
      event,
      "lifecycle-correlation",
    );
    const captured = vi.mocked(captureNotificationOccurrence).mock.calls[0]![1];
    expect(captured.eventKey).toBe(`workflow.information-request.${event}`);
    expect(captured.occurrenceKey).toBe(`rfi-${event}:${requestInformationId}`);
    expect(captured.correlationId).toBe("lifecycle-correlation");
    expect(parseNotificationContext(captured.eventKey, captured.context)).toHaveProperty(
      `${event}At`,
      source[event === "responded" ? "respondedAt" : "closedAt"].toISOString(),
    );
  });

  it.each(["responded", "closed"] as const)("requires persisted evidence before capturing %s", async (event) => {
    vi.mocked(loadWorkflowRfiNotificationSource).mockResolvedValue({
      ...source,
      closedAt: null,
      respondedAt: null,
    });
    await expect(captureWorkflowRfiLifecycleNotification(
      {} as never,
      requestInformationId,
      event,
    )).rejects.toThrow("timestamp is unavailable");
    expect(captureNotificationOccurrence).not.toHaveBeenCalled();
  });
  it("captures the owner and configured assignees with persisted request context", async () => {
    const transaction = {} as never;
    await captureWorkflowRfiCreatedNotification(transaction, requestInformationId);

    expect(captureNotificationOccurrence).toHaveBeenCalledWith(transaction, {
      aggregateId: applicationId,
      aggregateType: "WORKFLOW_RFI",
      context: {
        applicationId,
        applicationReference: snapshot.applicationReference,
        assignees: [assignee],
        correlationId: source.correlationId,
        createdAt: source.createdAt.toISOString(),
        deadlineAt: source.deadlineAt.toISOString(),
        fundingOpportunityTitle: snapshot.fundingOpportunityTitle,
        owner,
        question: source.question,
        requestInformationId,
        sourceIdempotencyKey: source.idempotencyKey,
        workflowInstanceId,
      },
      correlationId: source.correlationId,
      eventKey: "workflow.information-request.created",
      occurrenceKey: `rfi-created:${requestInformationId}`,
      recipients: [
        {
          ...owner,
          recipientType: "APPLICATION_OWNER",
          resolutionPath: "workflowRfi.recipientUserId",
        },
        {
          ...assignee,
          recipientType: "ASSIGNED_USER",
          resolutionPath: "workflowTask.assignment",
        },
      ],
    });
  });

  it("keeps long instructions within the notification context limit", async () => {
    vi.mocked(loadWorkflowRfiNotificationSource).mockResolvedValue({
      ...source,
      question: "A".repeat(12_000),
    });
    await captureWorkflowRfiCreatedNotification({} as never, requestInformationId);
    const captured = vi.mocked(captureNotificationOccurrence).mock.calls[0]![1];
    const context = parseNotificationContext(captured.eventKey, captured.context);
    expect(context).toHaveProperty("question", "A".repeat(2_000));
  });

  it.each([
    { ...snapshot, applicationId: workflowInstanceId },
    { ...snapshot, owner: assignee },
  ])("rejects mismatched application or recipient context", async (mismatch) => {
    vi.mocked(loadWorkflowDeadlineNotificationSnapshot).mockResolvedValue(mismatch);
    await expect(
      captureWorkflowRfiCreatedNotification({} as never, requestInformationId),
    ).rejects.toThrow("recipient does not match");
    expect(captureNotificationOccurrence).not.toHaveBeenCalled();
  });

  it("propagates capture failures to the enclosing workflow transaction", async () => {
    vi.mocked(captureNotificationOccurrence).mockRejectedValueOnce(new Error("capture failed"));
    await expect(
      captureWorkflowRfiCreatedNotification({} as never, requestInformationId),
    ).rejects.toThrow("capture failed");
  });

  it("uses the same occurrence identity when creation is replayed", async () => {
    await captureWorkflowRfiCreatedNotification({} as never, requestInformationId);
    await captureWorkflowRfiCreatedNotification({} as never, requestInformationId);
    const calls = vi.mocked(captureNotificationOccurrence).mock.calls;
    expect(calls[0]![1].occurrenceKey).toBe(calls[1]![1].occurrenceKey);
  });
});
