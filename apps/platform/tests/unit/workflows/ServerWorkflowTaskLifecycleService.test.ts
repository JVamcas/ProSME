import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowTaskLifecycleRepository",
  () => ({
    lockWorkflowTaskForLifecycle: vi.fn(),
    persistWorkflowTaskTransition: vi.fn(),
    withWorkflowTaskLifecycleTransaction: vi.fn(),
  }),
);

import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import { ResourceConflictError } from "@/lib/resource-errors";
import {
  cancelWorkflowTask,
  claimWorkflowTask,
  completeWorkflowTask,
  startWorkflowTask,
} from "@/modules/workflows/application/runtime/ServerWorkflowTaskLifecycleService";
import { defaultWorkflowElementPermissions } from "@/modules/workflows/domain/definitions/WorkflowElementPermissions";
import {
  lockWorkflowTaskForLifecycle,
  persistWorkflowTaskTransition,
  withWorkflowTaskLifecycleTransaction,
} from "@/modules/workflows/infrastructure/WorkflowTaskLifecycleRepository";

const actor: AuthenticatedUser = {
  capabilities: new Set([
    permissionCodes.workflowTaskClaim,
    permissionCodes.workflowTaskAssignedProcess,
    permissionCodes.workflowTaskAssignedDecide,
    permissionCodes.workflowTaskCancelAll,
  ]),
  createdAt: new Date(),
  displayName: "Reviewer",
  email: "reviewer@example.test",
  id: "11111111-1111-4111-8111-111111111111",
  identitySubject: "reviewer",
  lastLoginAt: null,
  roleCodes: new Set(["programme_officer"]),
  status: "active",
  updatedAt: new Date(),
  userType: "staff",
};

const input = {
  correlationId: "22222222-2222-4222-8222-222222222222",
  expectedRowVersion: 1,
  taskId: "33333333-3333-4333-8333-333333333333",
};

const task = {
  assignedUserId: null,
  claimableByActor: true,
  id: input.taskId,
  permissions: defaultWorkflowElementPermissions,
  rowVersion: 1,
  status: "PENDING" as const,
  workflowInstanceId: "44444444-4444-4444-8444-444444444444",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(withWorkflowTaskLifecycleTransaction).mockImplementation(
    async (work) => work({} as never),
  );
  vi.mocked(lockWorkflowTaskForLifecycle).mockResolvedValue(task);
  vi.mocked(persistWorkflowTaskTransition).mockImplementation(
    async (_transaction, transition) => ({
      assignedUserId: transition.actorId,
      claimedAt: transition.targetStatus === "CLAIMED" ? new Date() : null,
      completedAt: transition.targetStatus === "COMPLETED" ? new Date() : null,
      id: transition.taskId,
      rowVersion: transition.rowVersion + 1,
      startedAt: transition.targetStatus === "IN_PROGRESS" ? new Date() : null,
      status: transition.targetStatus,
    }),
  );
});

describe("server workflow task lifecycle service", () => {
  it("claims an eligible pending role task", async () => {
    const result = await claimWorkflowTask(actor, input);

    expect(result.status).toBe("CLAIMED");
    expect(persistWorkflowTaskTransition).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        actorId: actor.id,
        currentStatus: "PENDING",
        targetStatus: "CLAIMED",
      }),
    );
  });

  it("starts a claimed task assigned to the actor", async () => {
    vi.mocked(lockWorkflowTaskForLifecycle).mockResolvedValue({
      ...task,
      assignedUserId: actor.id,
      status: "CLAIMED",
    });

    await expect(startWorkflowTask(actor, input)).resolves.toMatchObject({
      status: "IN_PROGRESS",
    });
  });

  it("completes an in-progress task and records completion time", async () => {
    vi.mocked(lockWorkflowTaskForLifecycle).mockResolvedValue({
      ...task,
      assignedUserId: actor.id,
      status: "IN_PROGRESS",
    });

    await expect(completeWorkflowTask(actor, input)).resolves.toMatchObject({
      completedAt: expect.any(Date),
      status: "COMPLETED",
    });
  });

  it("rejects invalid direct completion from pending", async () => {
    await expect(completeWorkflowTask(actor, input)).rejects
      .toBeInstanceOf(ResourceConflictError);
    expect(persistWorkflowTaskTransition).not.toHaveBeenCalled();
  });

  it("cancels a non-terminal task with all-task authority", async () => {
    await expect(cancelWorkflowTask(actor, input)).resolves.toMatchObject({
      completedAt: null,
      status: "CANCELLED",
    });
  });

  it("rejects a context mismatch for another user's task", async () => {
    vi.mocked(lockWorkflowTaskForLifecycle).mockResolvedValue({
      ...task,
      assignedUserId: "55555555-5555-4555-8555-555555555555",
      status: "CLAIMED",
    });

    await expect(startWorkflowTask(actor, input)).rejects
      .toBeInstanceOf(ResourceConflictError);
    expect(persistWorkflowTaskTransition).not.toHaveBeenCalled();
  });
});
