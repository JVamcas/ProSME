import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowEscalationTrackingRepository",
  () => ({ readOwnEscalationTracking: vi.fn() }),
);
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowActionAvailabilityRepository",
  () => ({ readWorkflowActionAvailabilitySource: vi.fn() }),
);
import { getWorkflowEscalationTracking } from "@/modules/workflows/application/runtime/ServerWorkflowEscalationTrackingService";
import { readOwnEscalationTracking } from "@/modules/workflows/infrastructure/WorkflowEscalationTrackingRepository";
import { readWorkflowActionAvailabilitySource } from "@/modules/workflows/infrastructure/WorkflowActionAvailabilityRepository";
import { actor, source } from "../../support/WorkflowActionAvailabilityFixture";
import { permissionCodes } from "@/auth/authorization/permissions";
const taskId = crypto.randomUUID();
const reviewer = actor(permissionCodes.workflowTaskAssignedRead);
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readOwnEscalationTracking).mockResolvedValue({
    id: crypto.randomUUID(),
    taskId,
    taskName: "Review",
    stageName: "Finance",
    assignedUserName: "Current reviewer",
    assignedRoleName: null,
    canCancel: true,
    permissions: {
      visibility: "INTERNAL_ONLY",
      view: permissionCodes.workflowTaskAssignedRead,
      edit: permissionCodes.workflowTaskAssignedProcess,
      decide: permissionCodes.workflowTaskAssignedDecide,
    },
    rowVersion: 3,
    stageInstanceId: source.stage.stageInstanceId,
    workflowInstanceId: source.stage.workflowInstanceId,
  });
  vi.mocked(readWorkflowActionAvailabilitySource).mockResolvedValue(
    source as never,
  );
});
it("returns tracking details with every normal workflow action disabled", async () => {
  const result = await getWorkflowEscalationTracking(reviewer, taskId);
  expect(result).toMatchObject({
    assignedUserName: "Current reviewer",
    canCancel: true,
  });
  expect(result?.actions).toHaveLength(1);
  expect(result?.actions.every((action) => !action.available)).toBe(true);
  expect(result).not.toHaveProperty("permissions");
});
it("does not read action definitions without a current own escalation relationship", async () => {
  vi.mocked(readOwnEscalationTracking).mockResolvedValue(null);
  await expect(
    getWorkflowEscalationTracking(reviewer, taskId),
  ).resolves.toBeNull();
  expect(readWorkflowActionAvailabilitySource).not.toHaveBeenCalled();
});
it("denies missing resource permissions before reading actions", async () => {
  await expect(
    getWorkflowEscalationTracking(actor(), taskId),
  ).rejects.toThrow();
  expect(readOwnEscalationTracking).not.toHaveBeenCalled();
});
