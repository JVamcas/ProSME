import type { AuthenticatedUser } from "@/auth/types";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/workflows/infrastructure/WorkflowTaskRepository", () => ({ readWorkflowTask: vi.fn() }));
vi.mock("@/modules/workflows/application/runtime/ServerWorkflowActionAvailabilityService", () => ({
  getWorkflowActionAvailability: vi.fn(),
}));

import { permissionCodes } from "@/auth/authorization/permissions";
import { getWorkflowTask } from "@/modules/work-queue/application/ServerWorkflowTaskService";
import { readWorkflowTask } from "@/modules/workflows/infrastructure/WorkflowTaskRepository";
import { getWorkflowActionAvailability } from "@/modules/workflows/application/runtime/ServerWorkflowActionAvailabilityService";
import {
  workflowTaskActorFixture,
  workflowTaskServiceFixture as task,
} from "../../support/WorkflowTaskServiceFixture";

const actor: AuthenticatedUser = {
  ...workflowTaskActorFixture,
  id: "79e20de0-3558-4d63-90a4-8c9f5125df07",
  status: "active",
  capabilities: new Set([
    permissionCodes.workflowTaskAssignedRead,
    permissionCodes.workflowTaskAssignedProcess,
  ]),
};

const availableActions = [
  {
    actionType: "APPROVE_ADVANCE" as const,
    available: true,
    key: "ADVANCE",
    label: "Advance",
    presentation: { displayOrder: 1, variant: "success" as const },
    requiredInput: {
      confirmation: { message: null, required: false },
      dueDate: { deadlineDays: null, required: false },
      editableFieldPaths: [],
      reason: { maxLength: 4_000, required: false },
      reviewDate: { required: false },
      target: { type: null, value: null },
    },
    runtimeVersion: 1,
    unavailableReason: null,
  },
];


describe("assigned workflow task read projection", () => {
  it("returns only the configured checklist projection", async () => {
    vi.mocked(readWorkflowTask).mockResolvedValue(task);
    vi.mocked(getWorkflowActionAvailability).mockResolvedValue(availableActions);
    const result = await getWorkflowTask(actor, task.taskInstanceId);
    expect(result).toMatchObject({
      checklistItems: task.checklistItems,
      actions: availableActions,
      displayMode: "STEP_PROGRESS",
      dueAt: "2026-09-20T08:00:00.000Z",
      resultItems: [],
    });
    expect(result).not.toHaveProperty("config");
    expect(result).not.toHaveProperty("permissions");
    expect(result).not.toHaveProperty("result");
  });

});
