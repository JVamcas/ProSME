import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowEscalationCancellationRepository",
  () => ({
    withEscalationCancellationTransaction: vi.fn(async (work) => work({})),
    lockEscalationCancellationContext: vi.fn(),
    hasCommittedEscalationWork: vi.fn(),
    persistEscalationCancellation: vi.fn(),
  }),
);
import { permissionCodes } from "@/auth/authorization/permissions";
import { cancelWorkflowEscalation } from "@/modules/workflows/application/runtime/ServerWorkflowEscalationCancellationService";
import {
  hasCommittedEscalationWork,
  lockEscalationCancellationContext,
  persistEscalationCancellation,
  withEscalationCancellationTransaction,
} from "@/modules/workflows/infrastructure/WorkflowEscalationCancellationRepository";
import { actor } from "../../support/WorkflowActionAvailabilityFixture";
const reviewer = actor(permissionCodes.workflowEscalationOwnCancel);
const input = {
  taskId: crypto.randomUUID(),
  escalationId: crypto.randomUUID(),
  expectedRowVersion: 3,
  correlationId: crypto.randomUUID(),
};
const context = {
  escalationId: input.escalationId,
  escalationStatus: "ACTIVE",
  trigger: "MANUAL",
  escalatedBy: reviewer.id,
  assignedUserId: "new-assignee",
  assignedRoleId: null,
  sourceAssignedUserId: reviewer.id,
  sourceAssignedRoleId: "original-role",
  taskStatus: "PENDING",
  rowVersion: 3,
  stageStatus: "ACTIVE",
  stageInstanceId: "stage",
  workflowStatus: "ACTIVE",
  workflowInstanceId: "workflow",
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(lockEscalationCancellationContext).mockResolvedValue(context);
  vi.mocked(hasCommittedEscalationWork).mockResolvedValue(false);
  vi.mocked(persistEscalationCancellation).mockResolvedValue({
    taskId: input.taskId,
    taskStatus: "PENDING",
    rowVersion: 4,
  });
});
it.each(["PENDING", "IN_PROGRESS"])(
  "returns an unfinished %s task to its original assignee",
  async (taskStatus) => {
    vi.mocked(lockEscalationCancellationContext).mockResolvedValue({
      ...context,
      taskStatus,
    });
    await expect(
      cancelWorkflowEscalation(reviewer, input),
    ).resolves.toMatchObject({ taskId: input.taskId, taskStatus: "PENDING" });
    expect(persistEscalationCancellation).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        sourceAssignedUserId: reviewer.id,
        taskStatus,
      }),
      {
        actorId: reviewer.id,
        correlationId: input.correlationId,
        taskId: input.taskId,
      },
    );
  },
);
it("requires the specific permission before opening a transaction", async () => {
  await expect(
    cancelWorkflowEscalation(
      actor(permissionCodes.workflowTaskAssignedProcess),
      input,
    ),
  ).rejects.toThrow();
  expect(withEscalationCancellationTransaction).not.toHaveBeenCalled();
});
it.each([
  { sourceAssignedUserId: "someone-else" },
  { escalatedBy: "someone-else" },
  { trigger: "SLA_BREACH" },
])("denies a context mismatch %s without mutation", async (override) => {
  vi.mocked(lockEscalationCancellationContext).mockResolvedValue({
    ...context,
    ...override,
  });
  await expect(cancelWorkflowEscalation(reviewer, input)).rejects.toThrow();
  expect(persistEscalationCancellation).not.toHaveBeenCalled();
});
it.each([
  { taskStatus: "COMPLETED" },
  { taskStatus: "CANCELLED" },
  { escalationStatus: "RESOLVED" },
  { workflowStatus: "COMPLETED" },
  { stageStatus: "COMPLETED" },
  { rowVersion: 4 },
])("rejects committed, resolved or stale work %s", async (override) => {
  vi.mocked(lockEscalationCancellationContext).mockResolvedValue({
    ...context,
    ...override,
  });
  await expect(cancelWorkflowEscalation(reviewer, input)).rejects.toThrow();
  expect(persistEscalationCancellation).not.toHaveBeenCalled();
});
it("rejects a submitted review even while the task is still pending", async () => {
  vi.mocked(hasCommittedEscalationWork).mockResolvedValue(true);
  await expect(cancelWorkflowEscalation(reviewer, input)).rejects.toThrow(
    "committed their review",
  );
  expect(persistEscalationCancellation).not.toHaveBeenCalled();
});

it("returns an onward escalation to its own creator rather than the first sender", async () => {
  const onwardSender = { ...reviewer, id: crypto.randomUUID() };
  vi.mocked(lockEscalationCancellationContext).mockResolvedValue({
    ...context,
    escalatedBy: onwardSender.id,
    sourceAssignedUserId: onwardSender.id,
    assignedUserId: "third-reviewer",
  });
  await cancelWorkflowEscalation(onwardSender, input);
  expect(persistEscalationCancellation).toHaveBeenCalledWith(
    {},
    expect.objectContaining({
      sourceAssignedUserId: onwardSender.id,
      assignedUserId: "third-reviewer",
    }),
    expect.objectContaining({ actorId: onwardSender.id }),
  );
});
