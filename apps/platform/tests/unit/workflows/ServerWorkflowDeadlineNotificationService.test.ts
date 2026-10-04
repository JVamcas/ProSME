import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/notifications/application/ServerNotificationOccurrenceService", () => ({
  captureNotificationOccurrence: vi.fn(),
}));
vi.mock("@/modules/workflows/infrastructure/WorkflowDeadlineNotificationRepository", () => ({
  loadWorkflowDeadlineNotificationSnapshot: vi.fn(),
}));

import { captureNotificationOccurrence } from "@/modules/notifications/application/ServerNotificationOccurrenceService";
import { parseNotificationContext } from "@/modules/notifications/domain/NotificationEvent";
import { captureWorkflowDeadlineNotification } from "@/modules/workflows/application/runtime/ServerWorkflowDeadlineNotificationService";
import { loadWorkflowDeadlineNotificationSnapshot } from "@/modules/workflows/infrastructure/WorkflowDeadlineNotificationRepository";
import type { WorkflowDeadlineCandidate } from "@/modules/workflows/domain/runtime/WorkflowDeadline";

const applicationId = "10000000-0000-4000-8000-000000000001";
const sourceId = "20000000-0000-4000-8000-000000000001";
const owner = {
  userId: "30000000-0000-4000-8000-000000000001",
  displayName: "Applicant",
  email: "applicant@example.test",
};
const snapshot = {
  applicationId,
  applicationReference: "FUND-2026-00016",
  assignees: [],
  fundingOpportunityTitle: "SME fund",
  owner,
  stageName: "Screening",
};
const occurredAt = new Date("2026-10-03T10:00:00.000Z");
const rfi = { deadlineAt: occurredAt, question: "A".repeat(12_000) };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(loadWorkflowDeadlineNotificationSnapshot).mockResolvedValue(snapshot);
});

describe("scheduled information request notifications", () => {
  it.each([
    ["RFI_EXPIRED", "workflow.information-request.expired"],
    ["RFI_REMINDER", "workflow.information-request.reminder"],
  ] as const)("queues %s with valid context for long instructions", async (kind, eventKey) => {
    const candidate = {
      kind,
      occurrenceKey: `${kind}:${sourceId}:1`,
      scheduledFor: occurredAt,
      sourceId,
      stageInstanceId: applicationId,
      taskId: applicationId,
      workflowInstanceId: applicationId,
    } satisfies WorkflowDeadlineCandidate;
    const transaction = {} as never;
    await captureWorkflowDeadlineNotification(transaction, candidate, "deadline-correlation", occurredAt, rfi);
    const captured = vi.mocked(captureNotificationOccurrence).mock.calls[0]![1];
    expect(captured.eventKey).toBe(eventKey);
    expect(captured.occurrenceKey).toBe(candidate.occurrenceKey);
    expect(parseNotificationContext(eventKey, captured.context)).toHaveProperty("question", "A".repeat(2_000));
    expect(captured.recipients).toEqual([
      {
        ...owner,
        recipientType: "APPLICATION_OWNER",
        resolutionPath: "application.applicantUserId",
      },
    ]);
  });

  it("uses the saved recipient snapshot when expiry returns the workflow", async () => {
    await captureWorkflowDeadlineNotification({} as never, {
      kind: "RFI_EXPIRED",
      occurrenceKey: "rfi-expired",
      scheduledFor: occurredAt,
      sourceId,
      stageInstanceId: applicationId,
      taskId: applicationId,
      workflowInstanceId: applicationId,
    } satisfies WorkflowDeadlineCandidate, "expiry-correlation", occurredAt, rfi, snapshot);
    expect(loadWorkflowDeadlineNotificationSnapshot).not.toHaveBeenCalled();
    expect(captureNotificationOccurrence).toHaveBeenCalledOnce();
  });
});
