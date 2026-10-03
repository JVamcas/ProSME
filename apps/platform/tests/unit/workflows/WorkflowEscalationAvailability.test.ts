import { beforeEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowActionAvailabilityRepository",
  () => ({
    readWorkflowActionAvailabilitySource: vi.fn(),
    workflowActionAvailabilityDatabase: vi.fn(() => ({})),
  }),
);
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowEscalationTargetRepository",
  () => ({
    readWorkflowEscalationTargets: vi.fn(),
  }),
);
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowActionTargetRepository",
  () => ({
    configuredActionTargetsAreValid: vi.fn(),
  }),
);
vi.mock(
  "@/modules/workflows/infrastructure/TransitionExecutionRepository",
  () => ({
    loadSequentialTransitions: vi.fn(async () => ({
      actionExists: true,
      transitions: [],
    })),
  }),
);
vi.mock(
  "@/modules/workflows/application/runtime/ServerWorkflowActionContextService",
  () => ({
    buildWorkflowActionConditionContext: vi.fn(async () => ({
      application: {},
      eligibility: {},
      fundingCall: {},
      stages: [],
    })),
  }),
);
vi.mock(
  "@/modules/workflows/application/runtime/ServerWorkflowActionReadinessService",
  () => ({
    readWorkflowActionReadiness: vi.fn(async () => ({})),
    workflowActionReadinessReason: vi.fn(() => null),
  }),
);

import { permissionCodes } from "@/auth/authorization/permissions";
import { getWorkflowActionAvailability } from "@/modules/workflows/application/runtime/ServerWorkflowActionAvailabilityService";
import { readWorkflowActionAvailabilitySource } from "@/modules/workflows/infrastructure/WorkflowActionAvailabilityRepository";
import { readWorkflowEscalationTargets } from "@/modules/workflows/infrastructure/WorkflowEscalationTargetRepository";
import { configuredActionTargetsAreValid } from "@/modules/workflows/infrastructure/WorkflowActionTargetRepository";
import {
  actor,
  input,
  source,
} from "../../support/WorkflowActionAvailabilityFixture";

const taskId = "70000000-0000-4000-8000-000000000001";
const roleId = "80000000-0000-4000-8000-000000000001";
const userId = "90000000-0000-4000-8000-000000000001";
const reviewer = actor(
  permissionCodes.workflowTaskAssignedRead,
  permissionCodes.workflowTaskAssignedDecide,
  permissionCodes.workflowTaskAssignedProcess,
);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(configuredActionTargetsAreValid).mockResolvedValue(false);
  vi.mocked(readWorkflowActionAvailabilitySource).mockResolvedValue({
    ...source,
    actions: [
      {
        ...source.actions[0],
        actionType: "ESCALATE",
        stableKey: "ESCALATE",
        label: "Escalate",
        configuration: {
          blockUntilResolved: true,
          responsibility: "TRANSFER",
          targetType: "ROLE",
          targetId: roleId,
          trigger: "MANUAL",
        },
      },
    ],
    task: {
      id: taskId,
      assignedToActor: true,
      permissions: {
        view: permissionCodes.workflowTaskAssignedRead,
        decide: permissionCodes.workflowTaskAssignedDecide,
        edit: permissionCodes.workflowTaskAssignedProcess,
      },
      status: "IN_PROGRESS",
      taskType: "STAGE_DECISION",
    },
  } as never);
});

it("keeps escalation available with an eligible override despite an invalid default", async () => {
  const targets = [
    { id: userId, label: "Senior reviewer", targetType: "USER" as const },
  ];
  vi.mocked(readWorkflowEscalationTargets).mockResolvedValue(targets);
  const result = await getWorkflowActionAvailability(reviewer, {
    ...input,
    taskId,
  });
  expect(result[0]).toMatchObject({
    available: true,
    requiredInput: {
      target: { type: "ROLE", value: roleId },
      escalationTargets: targets,
    },
  });
  expect(configuredActionTargetsAreValid).not.toHaveBeenCalled();
  expect(readWorkflowEscalationTargets).toHaveBeenCalledWith({}, taskId);
});

it("disables escalation when there is no eligible runtime destination", async () => {
  vi.mocked(readWorkflowEscalationTargets).mockResolvedValue([]);
  const result = await getWorkflowActionAvailability(reviewer, {
    ...input,
    taskId,
  });
  expect(result[0]?.available).toBe(false);
  expect(result[0]?.unavailableReason).toBeTruthy();
});

it("denies non-assignees before reading possible destinations", async () => {
  vi.mocked(readWorkflowActionAvailabilitySource).mockResolvedValue({
    ...source,
    task: {
      id: taskId,
      assignedToActor: false,
      permissions: { view: permissionCodes.workflowTaskAssignedRead },
    },
  } as never);
  await expect(
    getWorkflowActionAvailability(reviewer, { ...input, taskId }),
  ).rejects.toThrow();
  expect(readWorkflowEscalationTargets).not.toHaveBeenCalled();
});
