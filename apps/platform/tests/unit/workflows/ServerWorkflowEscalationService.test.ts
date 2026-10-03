import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/workflows/infrastructure/WorkflowEscalationAssignmentRepository", () => ({
  loadEscalationAssignmentContext: vi.fn(),
}));
vi.mock("@/modules/workflows/infrastructure/WorkflowEscalationRepository", () => ({
  startWorkflowEscalation: vi.fn(),
}));
vi.mock("@/modules/workflows/infrastructure/WorkflowTaskAutoAssignmentRepository", () => ({
  allocateStageReviewers: vi.fn(),
}));
vi.mock("@/modules/workflows/infrastructure/WorkflowTaskAssignmentNotificationRepository", () => ({
  loadAssignedUserSnapshots: vi.fn(),
}));
vi.mock("@/modules/notifications/application/ServerNotificationOccurrenceService", () => ({
  captureNotificationOccurrence: vi.fn(),
}));
vi.mock("@/modules/workflows/application/runtime/WorkflowActionOutcomeSupport", () => ({
  failWorkflowAction: (_code: string, message: string) => { throw new Error(message); },
}));

import { transferWorkflowEscalation } from "@/modules/workflows/application/runtime/ServerWorkflowEscalationService";
import { loadEscalationAssignmentContext } from "@/modules/workflows/infrastructure/WorkflowEscalationAssignmentRepository";
import { startWorkflowEscalation } from "@/modules/workflows/infrastructure/WorkflowEscalationRepository";
import { allocateStageReviewers } from "@/modules/workflows/infrastructure/WorkflowTaskAutoAssignmentRepository";
import { loadAssignedUserSnapshots } from "@/modules/workflows/infrastructure/WorkflowTaskAssignmentNotificationRepository";
import { captureNotificationOccurrence } from "@/modules/notifications/application/ServerNotificationOccurrenceService";

const previousUserId = "10000000-0000-4000-8000-000000000001";
const assignedUserId = "10000000-0000-4000-8000-000000000002";
const roleId = "10000000-0000-4000-8000-000000000003";
const definitionId = "10000000-0000-4000-8000-000000000004";
const escalationId = "10000000-0000-4000-8000-000000000005";
const transaction = {} as never;
const input = {
  actionExecutionId: "10000000-0000-4000-8000-000000000006",
  actorId: previousUserId,
  configuration: {
    blockUntilResolved: true,
    responsibility: "TRANSFER" as const,
    targetType: "USER" as const,
    targetId: assignedUserId,
    trigger: "MANUAL" as const,
  },
  correlationId: "escalation-test",
  reason: "Needs intervention",
  stageInstanceId: "10000000-0000-4000-8000-000000000007",
  taskId: "10000000-0000-4000-8000-000000000008",
  workflowInstanceId: "10000000-0000-4000-8000-000000000009",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(loadEscalationAssignmentContext).mockResolvedValue({
    applicationId: "10000000-0000-4000-8000-000000000010",
    applicationReference: "APP-001",
    assignedRoleId: roleId,
    assignedUserId: previousUserId,
    definitionId,
    excludedUserIds: [previousUserId],
    fundingOpportunityTitle: "Growth fund",
    name: "Review application",
    stableKey: "REVIEW",
    stageName: "Assessment",
  });
  vi.mocked(allocateStageReviewers).mockResolvedValue(new Map([[definitionId, [assignedUserId]]]));
  vi.mocked(startWorkflowEscalation).mockResolvedValue({ id: escalationId });
  vi.mocked(loadAssignedUserSnapshots).mockResolvedValue([{
    userId: assignedUserId,
    displayName: "New reviewer",
    email: "reviewer@example.test",
  }]);
});

describe("escalation responsibility transfer", () => {
  it("transfers and captures the manual escalation notification in the same transaction", async () => {
    await transferWorkflowEscalation(transaction, input);
    expect(startWorkflowEscalation).toHaveBeenCalledWith(
      transaction,
      expect.objectContaining({ assignedUserId }),
    );
    expect(captureNotificationOccurrence).toHaveBeenCalledWith(
      transaction,
      expect.objectContaining({
        eventKey: "workflow.task.escalated",
        occurrenceKey: `workflow-escalation:${escalationId}`,
        context: expect.objectContaining({ escalationId, trigger: "MANUAL", reason: input.reason }),
        recipients: [expect.objectContaining({ userId: assignedUserId, recipientType: "ASSIGNED_USER" })],
      }),
    );
  });

  it("allocates a different eligible user in the destination role", async () => {
    const destinationRole = "10000000-0000-4000-8000-000000000011";
    await transferWorkflowEscalation(transaction, {
      ...input,
      configuration: { ...input.configuration, targetType: "ROLE", targetId: destinationRole },
    });
    expect(allocateStageReviewers).toHaveBeenCalledWith(transaction, input.workflowInstanceId, [expect.objectContaining({
      roleId: destinationRole,
      namedUserOverrideId: null,
      excludedUserIds: [previousUserId],
      reviewerCount: 1,
    })]);
  });

  it.each([
    { targetType: "USER" as const, targetId: previousUserId },
    { targetType: "ROLE" as const, targetId: roleId },
  ])("rejects the same current $targetType before writes", async (target) => {
    await expect(transferWorkflowEscalation(transaction, {
      ...input,
      configuration: { ...input.configuration, ...target },
    })).rejects.toThrow("different user or role");
    expect(startWorkflowEscalation).not.toHaveBeenCalled();
    expect(captureNotificationOccurrence).not.toHaveBeenCalled();
  });

  it("does not transfer or notify when no eligible destination exists", async () => {
    vi.mocked(allocateStageReviewers).mockRejectedValue(new Error("No eligible reviewer"));
    await expect(transferWorkflowEscalation(transaction, input)).rejects.toThrow("No eligible reviewer");
    expect(startWorkflowEscalation).not.toHaveBeenCalled();
    expect(captureNotificationOccurrence).not.toHaveBeenCalled();
  });

  it("propagates notification failures so the enclosing transaction rolls back", async () => {
    vi.mocked(captureNotificationOccurrence).mockRejectedValueOnce(new Error("Outbox unavailable"));
    await expect(transferWorkflowEscalation(transaction, input)).rejects.toThrow("Outbox unavailable");
  });
});
