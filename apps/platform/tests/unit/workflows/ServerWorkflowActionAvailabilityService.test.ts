import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowRfiFieldRepository",
  () => ({
    readWorkflowRfiFieldOptions: vi.fn(),
  }),
);
vi.mock("@/modules/workflows/infrastructure/StageCompletionRepository", () => ({
  loadRequiredTaskCompletions: vi.fn(),
}));
vi.mock("@/modules/workflows/infrastructure/WorkflowQuorumRepository", () => ({
  evaluateStageQuorum: vi.fn(),
}));
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowActionTaskReadinessRepository",
  () => ({
    readWorkflowActionTaskReadiness: vi.fn(),
  }),
);
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowActionAvailabilityRepository",
  () => ({
    readWorkflowActionAvailabilitySource: vi.fn(),
    workflowActionAvailabilityDatabase: vi.fn(),
  }),
);
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowActionTargetRepository",
  () => ({ configuredActionTargetsAreValid: vi.fn() }),
);
vi.mock(
  "@/modules/workflows/infrastructure/TransitionExecutionRepository",
  () => ({ loadSequentialTransitions: vi.fn() }),
);
vi.mock(
  "@/modules/workflows/application/runtime/ServerWorkflowActionContextService",
  () => ({ buildWorkflowActionConditionContext: vi.fn() }),
);

import { loadRequiredTaskCompletions } from "@/modules/workflows/infrastructure/StageCompletionRepository";
import { readWorkflowRfiFieldOptions } from "@/modules/workflows/infrastructure/WorkflowRfiFieldRepository";
import { readWorkflowActionTaskReadiness } from "@/modules/workflows/infrastructure/WorkflowActionTaskReadinessRepository";
import { evaluateStageQuorum } from "@/modules/workflows/infrastructure/WorkflowQuorumRepository";
import { permissionCodes } from "@/auth/authorization/permissions";
import { getWorkflowActionAvailability } from "@/modules/workflows/application/runtime/ServerWorkflowActionAvailabilityService";
import { buildWorkflowActionConditionContext } from "@/modules/workflows/application/runtime/ServerWorkflowActionContextService";
import {
  readWorkflowActionAvailabilitySource,
  workflowActionAvailabilityDatabase,
} from "@/modules/workflows/infrastructure/WorkflowActionAvailabilityRepository";
import { configuredActionTargetsAreValid } from "@/modules/workflows/infrastructure/WorkflowActionTargetRepository";
import { loadSequentialTransitions } from "@/modules/workflows/infrastructure/TransitionExecutionRepository";

import {
  actor,
  input,
  source,
  stageInstanceId,
} from "../../support/WorkflowActionAvailabilityFixture";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readWorkflowRfiFieldOptions).mockResolvedValue([
    { label: "Turnover", path: "application.turnover" },
  ]);
  vi.mocked(loadRequiredTaskCompletions).mockResolvedValue([]);
  vi.mocked(evaluateStageQuorum).mockResolvedValue(true);
  vi.mocked(readWorkflowActionTaskReadiness).mockResolvedValue({
    hasOpenRfi: false,
    workReady: true,
  });
  vi.mocked(readWorkflowActionAvailabilitySource).mockResolvedValue(
    source as never,
  );
  vi.mocked(workflowActionAvailabilityDatabase).mockReturnValue({} as never);
  vi.mocked(configuredActionTargetsAreValid).mockResolvedValue(true);
  vi.mocked(loadSequentialTransitions).mockResolvedValue({
    actionExists: true,
    transitions: [],
  });
  vi.mocked(buildWorkflowActionConditionContext).mockResolvedValue({
    application: {},
    eligibility: {},
    fundingCall: {},
    stages: [],
  });
});

describe("workflow action availability service", () => {
  it("returns configuration-driven presentation and required inputs", async () => {
    const result = await getWorkflowActionAvailability(
      actor(
        permissionCodes.workflowTaskAllRead,
        permissionCodes.workflowTaskAssignedDecide,
      ),
      input,
    );

    expect(result).toEqual([
      expect.objectContaining({
        actionType: "REJECT",
        available: true,
        key: "REJECT",
        label: "Reject",
        presentation: { displayOrder: 4, variant: "danger" },
        requiredInput: expect.objectContaining({
          confirmation: { message: null, required: false },
          reason: { maxLength: 4_000, required: false },
        }),
        runtimeVersion: 7,
        unavailableReason: null,
      }),
    ]);
  });

  it("returns a safe actor-specific denial without evaluating conditions", async () => {
    const result = await getWorkflowActionAvailability(
      actor(permissionCodes.workflowTaskAllRead),
      input,
    );

    expect(result).toEqual([
      expect.objectContaining({
        available: false,
        unavailableReason: "This action is not available to you.",
      }),
    ]);
    expect(buildWorkflowActionConditionContext).not.toHaveBeenCalled();
    expect(loadSequentialTransitions).not.toHaveBeenCalled();
  });

  it("disables advance when quorum is absent without recording an evaluation", async () => {
    vi.mocked(readWorkflowActionAvailabilitySource).mockResolvedValue({
      ...source,
      actions: [
        {
          ...source.actions[0],
          actionType: "APPROVE_ADVANCE",
          configuration: {},
        },
      ],
    } as never);
    vi.mocked(evaluateStageQuorum).mockResolvedValue(false);
    const result = await getWorkflowActionAvailability(
      actor(
        permissionCodes.workflowTaskAllRead,
        permissionCodes.workflowTaskAssignedDecide,
      ),
      input,
    );
    expect(result[0]).toMatchObject({
      available: false,
      unavailableReason: "The required participation quorum is absent.",
    });
    expect(evaluateStageQuorum).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        recordEvaluation: false,
        stageInstanceId,
      }),
    );
  });

  it.each([
    [
      { hasOpenRfi: true, workReady: true },
      "Close the open information request before completing this task.",
    ],
    [
      { hasOpenRfi: false, workReady: false },
      "Complete the required task work before choosing this action.",
    ],
    [{ hasOpenRfi: false, workReady: true }, null],
  ])(
    "checks task readiness before enabling advance: %s",
    async (readiness, reason) => {
      const taskId = "70000000-0000-4000-8000-000000000001";
      vi.mocked(readWorkflowActionAvailabilitySource).mockResolvedValue({
        ...source,
        actions: [
          {
            ...source.actions[0],
            actionType: "APPROVE_ADVANCE",
            configuration: {},
          },
        ],
        task: {
          id: taskId,
          assignedToActor: true,
          permissions: {
            view: permissionCodes.workflowTaskAssignedRead,
            decide: permissionCodes.workflowTaskAssignedDecide,
          },
          status: "IN_PROGRESS",
          taskType: "STAGE_DECISION",
        },
      } as never);
      vi.mocked(readWorkflowActionTaskReadiness).mockResolvedValue(readiness);
      const result = await getWorkflowActionAvailability(
        actor(
          permissionCodes.workflowTaskAssignedRead,
          permissionCodes.workflowTaskAssignedDecide,
        ),
        { ...input, taskId },
      );
      expect(result[0]).toMatchObject({
        available: reason === null,
        unavailableReason: reason,
      });
      expect(readWorkflowActionTaskReadiness).toHaveBeenCalledWith({}, taskId);
    },
  );

  it("disables advance when the remaining stage completion threshold is unmet", async () => {
    vi.mocked(readWorkflowActionAvailabilitySource).mockResolvedValue({
      ...source,
      actions: [
        {
          ...source.actions[0],
          actionType: "APPROVE_ADVANCE",
          configuration: {},
        },
      ],
    } as never);
    vi.mocked(loadRequiredTaskCompletions).mockResolvedValue([
      {
        taskDefinitionId: "required-task",
        taskKey: "REVIEW",
        completedCount: 1,
        completedTaskIds: ["completed-task"],
        denominator: 2,
        completionMode: "ALL",
        completionPercentage: null,
        requiredCompletionCount: 2,
      },
    ]);
    const result = await getWorkflowActionAvailability(
      actor(
        permissionCodes.workflowTaskAllRead,
        permissionCodes.workflowTaskAssignedDecide,
      ),
      input,
    );
    expect(result[0]).toMatchObject({
      available: false,
      unavailableReason:
        "Complete the remaining required stage work before advancing.",
    });
  });

  it("keeps request information available before task work is complete", async () => {
    vi.mocked(readWorkflowActionAvailabilitySource).mockResolvedValue({
      ...source,
      actions: [
        {
          ...source.actions[0],
          actionType: "REQUEST_INFORMATION",
          configuration: {
            continuation: "RESUME_SOURCE_TASK",
            deadlineDays: 7,
            editableFieldPaths: ["application.turnover"],
            reminderDayOffsets: [],
            expiryAction: "CLOSE_REQUEST",
            participantScope: "APPLICATION_OWNER_AND_REQUESTER",
            recipientScope: "APPLICATION_OWNER",
          },
        },
      ],
    } as never);
    const result = await getWorkflowActionAvailability(
      actor(
        permissionCodes.workflowTaskAllRead,
        permissionCodes.workflowTaskAssignedProcess,
        permissionCodes.fundingApplicationInformationRequestCreate,
      ),
      input,
    );
    expect(result[0]).toMatchObject({
      available: true,
      unavailableReason: null,
    });
    expect(result[0]?.requiredInput.editableFields).toEqual([
      { label: "Turnover", path: "application.turnover" },
    ]);
    expect(readWorkflowActionTaskReadiness).not.toHaveBeenCalled();
    expect(loadRequiredTaskCompletions).not.toHaveBeenCalled();
    expect(evaluateStageQuorum).not.toHaveBeenCalled();
  });
});
