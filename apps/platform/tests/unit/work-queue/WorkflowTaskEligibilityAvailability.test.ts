import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/workflows/infrastructure/WorkflowTaskRepository", () => ({
  readWorkflowTask: vi.fn(),
}));
vi.mock(
  "@/modules/workflows/application/runtime/ServerWorkflowActionAvailabilityService",
  () => ({ getWorkflowActionAvailability: vi.fn() }),
);

import type { AuthenticatedUser } from "@/auth/types";
import { getWorkflowTask } from "@/modules/work-queue/ServerWorkflowTaskService";
import { readWorkflowTask } from "@/modules/workflows/infrastructure/WorkflowTaskRepository";
import { getWorkflowActionAvailability } from "@/modules/workflows/application/runtime/ServerWorkflowActionAvailabilityService";
import { workflowTaskServiceFixture as task } from "../../support/WorkflowTaskServiceFixture";

const actor: AuthenticatedUser = {
  capabilities: new Set([task.permissions.view]),
  createdAt: new Date(),
  displayName: "Reviewer",
  email: "reviewer@example.test",
  id: "79e20de0-3558-4d63-90a4-8c9f5125df07",
  identitySubject: "reviewer",
  lastLoginAt: null,
  roleCodes: new Set(),
  status: "active",
  updatedAt: new Date(),
  userType: "staff",
};

describe("workflow task eligibility availability", () => {
  it.each([
    ["ELIGIBILITY_VERIFICATION", true],
    ["APPLICATION_REVIEW", false],
  ])("offers evaluation for form purpose %s: %s", async (formPurpose, expected) => {
    vi.mocked(readWorkflowTask).mockResolvedValue({
      ...task,
      config: { formPurpose },
    });
    vi.mocked(getWorkflowActionAvailability).mockResolvedValue([]);

    const result = await getWorkflowTask(actor, task.taskInstanceId);

    expect(result.canEvaluateEligibility).toBe(expected);
  });
});
