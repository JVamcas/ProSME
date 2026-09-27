import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/workflows/infrastructure/WorkflowQuorumRepository", () => ({
  evaluateStageQuorum: vi.fn(),
}));
vi.mock("@/modules/workflows/infrastructure/StageCompletionRepository", () => ({
  loadRequiredTaskCompletions: vi.fn(),
  recordReviewThresholdEvaluations: vi.fn(),
}));
vi.mock(
  "@/modules/workflows/application/runtime/ServerWorkflowActionContextService",
  () => ({ buildWorkflowActionConditionContext: vi.fn() }),
);
vi.mock(
  "@/modules/workflows/infrastructure/TransitionExecutionRepository",
  () => ({ loadSequentialTransitions: vi.fn() }),
);
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowActionExecutionRepository",
  () => ({
    claimWorkflowActionRuntimeVersion: vi.fn(),
    completeActionTask: vi.fn(),
    findWorkflowActionExecution: vi.fn(),
    lockWorkflowActionExecutionTarget: vi.fn(),
    recordWorkflowActionExecution: vi.fn(),
  }),
);
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowActionExecutionConnection",
  () => ({
    withWorkflowActionExecutionTransaction: vi.fn(),
    workflowActionExecutionDatabase: vi.fn(),
  }),
);
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowActionTargetRepository",
  () => ({ configuredActionTargetsAreValid: vi.fn() }),
);
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowRfiRepository",
  () => ({ createWorkflowRfi: vi.fn() }),
);

import type { AuthenticatedUser } from "@/auth/types";
import { executeWorkflowAction } from "@/modules/workflows/application/runtime/ServerWorkflowActionExecutionService";
import { buildWorkflowActionConditionContext } from "@/modules/workflows/application/runtime/ServerWorkflowActionContextService";
import { loadSequentialTransitions } from "@/modules/workflows/infrastructure/TransitionExecutionRepository";
import {
  claimWorkflowActionRuntimeVersion,
  completeActionTask,
  findWorkflowActionExecution,
  lockWorkflowActionExecutionTarget,
  recordWorkflowActionExecution,
} from "@/modules/workflows/infrastructure/WorkflowActionExecutionRepository";
import {
  withWorkflowActionExecutionTransaction,
  workflowActionExecutionDatabase,
} from "@/modules/workflows/infrastructure/WorkflowActionExecutionConnection";
import { configuredActionTargetsAreValid } from "@/modules/workflows/infrastructure/WorkflowActionTargetRepository";
import { createWorkflowRfi } from "@/modules/workflows/infrastructure/WorkflowRfiRepository";

const actorId = "10000000-0000-4000-8000-000000000001";
const workflowInstanceId = "20000000-0000-4000-8000-000000000001";
const stageInstanceId = "30000000-0000-4000-8000-000000000001";
const taskId = "40000000-0000-4000-8000-000000000001";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(workflowActionExecutionDatabase).mockReturnValue({} as never);
  vi.mocked(findWorkflowActionExecution).mockResolvedValue(null);
  vi.mocked(withWorkflowActionExecutionTransaction).mockImplementation(
    async (work) => work({} as never),
  );
  vi.mocked(lockWorkflowActionExecutionTarget).mockResolvedValue({
    action: {
      actionType: "REQUEST_INFORMATION",
      condition: null,
      configuration: {
        continuation: "RESUME_SOURCE_TASK",
        deadlineDays: 10,
        editableFieldPaths: ["application.financial.turnover"],
        expiryAction: "RETURN",
        participantScope: "APPLICATION_OWNER_AND_REQUESTER",
        recipientScope: "APPLICATION_OWNER",
        reminderDayOffsets: [3],
      },
      displayOrder: 1,
      enabled: true,
      id: "50000000-0000-4000-8000-000000000001",
      label: "Request information",
      reasonCodeRequired: false,
      stableKey: "REQUEST_INFORMATION",
    },
    stage: {
      application: { id: "60000000-0000-4000-8000-000000000001" },
      completedAt: null,
      eligibility: {},
      exitCondition: null,
      fundingCall: {},
      rowVersion: 2,
      stageDefinitionId: "70000000-0000-4000-8000-000000000001",
      stageInstanceId,
      stageKey: "SCREENING",
      status: "ACTIVE",
      workflowInstanceId,
      workflowVersionId: "80000000-0000-4000-8000-000000000001",
    },
    task: {
      assignedToActor: true,
      id: taskId,
      permissions: {
        decide: "workflow.task.assigned.decide",
        edit: "workflow.task.assigned.process",
        view: "workflow.task.assigned.read",
        visibility: "INTERNAL_ONLY",
      },
      rowVersion: 5,
      status: "IN_PROGRESS",
    },
  } as never);
  vi.mocked(buildWorkflowActionConditionContext).mockResolvedValue({
    application: {},
    eligibility: {},
    fundingCall: {},
    stages: [],
  });
  vi.mocked(loadSequentialTransitions).mockResolvedValue({
    actionExists: true,
    transitions: [],
  });
  vi.mocked(configuredActionTargetsAreValid).mockResolvedValue(true);
});

describe("request information action execution", () => {
  it("fails before any workflow mutation when RFI creation fails", async () => {
    vi.mocked(createWorkflowRfi).mockRejectedValue(
      new Error("RFI persistence failed"),
    );
    const user = {
      capabilities: new Set([
        "workflow.task.assigned.process",
        "funding.application.information-request.create",
      ]),
      id: actorId,
      status: "active",
    } as unknown as AuthenticatedUser;

    await expect(executeWorkflowAction(user, {
      actionKey: "REQUEST_INFORMATION",
      correlationId: "90000000-0000-4000-8000-000000000001",
      expectedRuntimeVersion: 2,
      idempotencyKey: "a0000000-0000-4000-8000-000000000001",
      input: {
        actionType: "REQUEST_INFORMATION",
        editableFieldPaths: ["application.financial.turnover"],
        instructions: "Please clarify the turnover amount.",
        question: "What is the correct turnover amount?",
        requestedDocumentRequirementIds: [
          "b0000000-0000-4000-8000-000000000001",
        ],
      },
      sourceStageInstanceId: stageInstanceId,
      taskId,
      workflowInstanceId,
    })).rejects.toThrow("RFI persistence failed");

    expect(claimWorkflowActionRuntimeVersion).not.toHaveBeenCalled();
    expect(completeActionTask).not.toHaveBeenCalled();
    expect(recordWorkflowActionExecution).not.toHaveBeenCalled();
  });
});
