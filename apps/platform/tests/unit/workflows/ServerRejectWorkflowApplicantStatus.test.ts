import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowRejectionRepository",
  () => ({
    rejectTerminalWorkflow: vi.fn(),
  }),
);
vi.mock(
  "@/modules/workflows/infrastructure/TransitionExecutionRepository",
  () => ({
    recordTransitionExecution: vi.fn(),
    finalizeTransitionExecution: vi.fn(),
  }),
);

import { executeTerminalRejectInTransaction } from "@/modules/workflows/application/runtime/ServerRejectWorkflowActionService";
import { rejectTerminalWorkflow } from "@/modules/workflows/infrastructure/WorkflowRejectionRepository";
import { recordTransitionExecution } from "@/modules/workflows/infrastructure/TransitionExecutionRepository";

const legacyMapping = {
  label: "Decision available",
  description: "A decision is available for your application.",
  status: "CLOSED" as const,
};
const input = {
  actionKey: "REJECT",
  actorId: "actor",
  conditionEvaluation: {
    evaluation: null,
    passed: true,
    resolutionError: null,
  },
  configuration: {
    cancelOpenStageInstances: true as const,
    cancelOpenTasks: true as const,
    publicStatusMapping: legacyMapping,
    type: "TERMINAL" as const,
  },
  correlationId: "correlation",
  rejectedAt: new Date(),
  sourceStageInstanceId: "stage",
  transition: {
    id: "transition",
    condition: null,
    priority: 1,
    targetStages: [],
    terminalOutcome: "RECOVERY",
  },
  workflowInstanceId: "workflow",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(recordTransitionExecution).mockResolvedValue({ id: "execution" });
  vi.mocked(rejectTerminalWorkflow).mockResolvedValue({
    cancelledStageInstanceIds: [],
    cancelledTaskIds: [],
  });
});

describe("terminal rejection applicant wording", () => {
  it("uses the selected route wording and derives its status code", async () => {
    const wording = {
      label: "Recovery review",
      description: "Please review the decision.",
    };
    await executeTerminalRejectInTransaction({} as never, {
      ...input,
      transition: { ...input.transition, terminalApplicantStatus: wording },
    });
    expect(rejectTerminalWorkflow).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        configuration: expect.objectContaining({
          publicStatusMapping: { ...wording, status: "OUTCOME_AVAILABLE" },
        }),
      }),
    );
  });

  it("retains existing wording for a legacy published route", async () => {
    await executeTerminalRejectInTransaction({} as never, input);
    expect(rejectTerminalWorkflow).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        configuration: expect.objectContaining({
          publicStatusMapping: legacyMapping,
        }),
      }),
    );
  });
});
