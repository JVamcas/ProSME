import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/notifications/application/ServerNotificationOccurrenceService", () => ({
  captureNotificationOccurrence: vi.fn(),
}));
vi.mock("@/modules/workflows/infrastructure/WorkflowTaskAssignmentNotificationRepository", () => ({
  loadAssignedUserSnapshots: vi.fn(),
}));

import { captureNotificationOccurrence } from "@/modules/notifications/application/ServerNotificationOccurrenceService";
import { captureWorkflowTaskAssignmentNotification } from "@/modules/workflows/application/runtime/ServerWorkflowTaskAssignmentNotificationService";
import { loadAssignedUserSnapshots } from "@/modules/workflows/infrastructure/WorkflowTaskAssignmentNotificationRepository";

const reviewerOne = "10000000-0000-4000-8000-000000000001";
const reviewerTwo = "10000000-0000-4000-8000-000000000002";
const stageInstanceId = "20000000-0000-4000-8000-000000000001";
const input = {
  assignedAt: new Date("2026-09-27T09:00:00.000Z"),
  correlationId: "activation-correlation",
  stageInstanceId,
  target: {
    applicationId: "30000000-0000-4000-8000-000000000001",
    applicationReference: "SME Fund-2026-001",
    fundingOpportunityTitle: "Growth Fund",
    stageName: "Technical review",
    workflowInstanceId: "40000000-0000-4000-8000-000000000001",
  },
  tasks: [
    { assignedUserId: reviewerOne, id: "50000000-0000-4000-8000-000000000001", name: "Assess finances" },
    { assignedUserId: reviewerOne, id: "50000000-0000-4000-8000-000000000002", name: "Assess plan" },
    { assignedUserId: reviewerTwo, id: "50000000-0000-4000-8000-000000000003", name: "Check compliance" },
    { assignedUserId: null, id: "50000000-0000-4000-8000-000000000004", name: "Unassigned" },
  ],
};

describe("workflow task assignment notification capture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadAssignedUserSnapshots).mockResolvedValue([
      { displayName: "Reviewer One", email: "one@example.test", userId: reviewerOne },
      { displayName: "Reviewer Two", email: "two@example.test", userId: reviewerTwo },
    ]);
    vi.mocked(captureNotificationOccurrence).mockResolvedValue({
      created: true,
      deliveryCount: 2,
      id: "60000000-0000-4000-8000-000000000001",
      status: "PENDING",
    });
  });

  it("groups assigned tasks in one occurrence and one recipient per user", async () => {
    await captureWorkflowTaskAssignmentNotification({} as never, input as never);

    expect(loadAssignedUserSnapshots).toHaveBeenCalledWith(
      expect.anything(),
      [reviewerOne, reviewerOne, reviewerTwo],
    );
    expect(captureNotificationOccurrence).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        context: expect.objectContaining({
          assignees: expect.arrayContaining([
            expect.objectContaining({ userId: reviewerOne }),
            expect.objectContaining({ userId: reviewerTwo }),
          ]),
          sourceIdempotencyKey: `stage-activation:${stageInstanceId}`,
          tasks: [
            expect.objectContaining({ assignedUserId: reviewerOne, taskName: "Assess finances" }),
            expect.objectContaining({ assignedUserId: reviewerOne, taskName: "Assess plan" }),
            expect.objectContaining({ assignedUserId: reviewerTwo, taskName: "Check compliance" }),
          ],
        }),
        occurrenceKey: `stage-activation:${stageInstanceId}`,
        recipients: [
          expect.objectContaining({ userId: reviewerOne }),
          expect.objectContaining({ userId: reviewerTwo }),
        ],
      }),
    );
  });

  it("does not create an invalid occurrence for unassigned tasks", async () => {
    await expect(captureWorkflowTaskAssignmentNotification({} as never, {
      ...input,
      tasks: [{ assignedUserId: null, id: input.tasks[3]!.id, name: "Unassigned" }],
    } as never)).resolves.toBeNull();
    expect(loadAssignedUserSnapshots).not.toHaveBeenCalled();
    expect(captureNotificationOccurrence).not.toHaveBeenCalled();
  });
});
