import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/workflows/infrastructure/StageCompletionRepository", () => ({
  persistStageCompletion: vi.fn(),
  loadRequiredTaskCompletions: vi.fn(),
}));
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowActionTaskReadinessRepository",
  () => ({
    readWorkflowActionTaskReadiness: vi.fn(),
  }),
);
vi.mock("@/modules/workflows/infrastructure/WorkflowQuorumRepository", () => ({
  evaluateStageQuorum: vi.fn(),
}));
vi.mock(
  "@/modules/workflows/application/runtime/ServerStageActivationService",
  () => ({ activateStageInTransaction: vi.fn() }),
);
vi.mock(
  "@/modules/workflows/application/runtime/WorkflowActionOutcomeSupport",
  () => ({
    buildExecutionResult: vi.fn((value) => value),
    persistActionAndDecision: vi.fn(),
    failWorkflowAction: vi.fn((code, message) => {
      throw new Error(`${code}: ${message}`);
    }),
  }),
);
vi.mock("@/modules/workflows/infrastructure/WorkflowControlRepository", () => ({
  recordWorkflowRework: vi.fn(),
}));

import { executeWorkflowControlOutcome } from "@/modules/workflows/application/runtime/ServerWorkflowControlOutcomeService";
import {
  readWorkflowActionReadiness,
  workflowActionReadinessReason,
} from "@/modules/workflows/application/runtime/ServerWorkflowActionReadinessService";
import { evaluateWorkflowActionPolicy } from "@/modules/workflows/application/runtime/WorkflowActionPolicy";
import {
  persistStageCompletion,
  loadRequiredTaskCompletions,
} from "@/modules/workflows/infrastructure/StageCompletionRepository";
import { readWorkflowActionTaskReadiness } from "@/modules/workflows/infrastructure/WorkflowActionTaskReadinessRepository";
import { activateStageInTransaction } from "@/modules/workflows/application/runtime/ServerStageActivationService";
import { recordWorkflowRework } from "@/modules/workflows/infrastructure/WorkflowControlRepository";
import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import { defaultWorkflowElementPermissions } from "@/modules/workflows/domain/definitions/WorkflowElementPermissions";

const stage = {
  stageInstanceId: "C1",
  workflowInstanceId: "workflow",
  status: "ACTIVE",
};
const input = {
  actorId: "actor",
  command: {
    sourceStageInstanceId: "C1",
    correlationId: "correlation",
    input: { actionType: "RETURN" },
  },
  resultingRuntimeVersion: 2,
  runtimeDestination: { id: "B", name: "Previous review" },
  target: {
    stage,
    action: {
      actionType: "RETURN",
      configuration: { dataHandling: "RETAIN" },
      reasonRequired: false,
    },
  },
};
const actor = {
  status: "active",
  capabilities: new Set([permissionCodes.workflowTaskAssignedDecide]),
} as unknown as AuthenticatedUser;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(persistStageCompletion).mockResolvedValue({ id: "C1" });
  vi.mocked(activateStageInTransaction).mockResolvedValue({
    kind: "activated",
    stageInstanceId: "B2",
    taskIds: ["review"],
  });
});

describe("Return interrupts incomplete review", () => {
  it("does not load task completion or form readiness for Return", async () => {
    const readiness = await readWorkflowActionReadiness({} as never, {
      actionTypes: ["RETURN"],
      actorId: "actor",
      recordQuorumEvaluation: false,
      stageDefinitionId: "C",
      stageInstanceId: "C1",
      taskId: "task",
    });
    expect(readWorkflowActionTaskReadiness).not.toHaveBeenCalled();
    expect(loadRequiredTaskCompletions).not.toHaveBeenCalled();
    expect(
      workflowActionReadinessReason("RETURN", {
        ...readiness,
        task: { workReady: false, hasOpenRfi: true },
      } as never),
    ).toBeNull();
  });

  it("allows controls before eligibility and contributing work finish but preserves authorization", () => {
    const target = {
      action: { actionType: "RETURN" as const, enabled: true },
      workflowStatus: "ACTIVE",
      stageStatus: "ACTIVE",
      task: {
        assignedToActor: true,
        status: "IN_PROGRESS",
        permissions: defaultWorkflowElementPermissions,
        eligibilityReady: false,
        prerequisitesComplete: false,
      },
    };
    const checks = {
      configurationValid: true,
      targetsValid: true,
      conditionsPass: true,
    };
    expect(evaluateWorkflowActionPolicy(actor, target, checks).available).toBe(
      true,
    );
    expect(
      evaluateWorkflowActionPolicy(
        actor,
        { ...target, task: { ...target.task, assignedToActor: false } },
        checks,
      ).available,
    ).toBe(false);
    expect(
      evaluateWorkflowActionPolicy(
        { ...actor, capabilities: new Set() },
        target,
        checks,
      ).available,
    ).toBe(false);
    expect(
      evaluateWorkflowActionPolicy(actor, target, {
        ...checks,
        conditionsPass: false,
      }).available,
    ).toBe(false);
    expect(
      evaluateWorkflowActionPolicy(
        actor,
        {
          ...target,
          action: { ...target.action, actionType: "APPROVE_ADVANCE" },
        },
        checks,
      ).available,
    ).toBe(false);
  });

  it("closes the interrupted iteration and opens the previous stage without a reason when optional", async () => {
    await executeWorkflowControlOutcome(
      {} as never,
      input as never,
      { executionId: "execution" } as never,
    );
    expect(persistStageCompletion).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        closure: "RETURN",
        requirements: [],
        target: stage,
      }),
    );
    expect(activateStageInTransaction).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        iterationStrategy: "NEXT",
        stageDefinitionId: "B",
        returnContext: expect.objectContaining({
          sourceStageInstanceId: "C1",
          reason: null,
        }),
      }),
    );
    expect(recordWorkflowRework).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        targetStageInstanceId: "B2",
        reason: undefined,
      }),
    );
  });

  it("rejects a stale source iteration before activating any destination", async () => {
    vi.mocked(persistStageCompletion).mockResolvedValue(null);
    await expect(
      executeWorkflowControlOutcome({} as never, input as never, {} as never),
    ).rejects.toThrow("no longer active");
    expect(activateStageInTransaction).not.toHaveBeenCalled();
  });
});
