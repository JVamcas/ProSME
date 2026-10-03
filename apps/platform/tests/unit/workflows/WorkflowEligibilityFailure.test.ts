import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/applications/application/ServerApplicationTerminalStatusService", () => ({
  captureApplicationTerminalStatus: vi.fn(),
}));
vi.mock("@/modules/workflows/infrastructure/WorkflowRejectionRepository", () => ({
  rejectTerminalWorkflow: vi.fn(),
}));

import { captureApplicationTerminalStatus } from "@/modules/applications/application/ServerApplicationTerminalStatusService";
import { terminateWorkflowOnEligibilityFailure } from "@/modules/workflows/application/runtime/ServerWorkflowEligibilityFailureService";
import { rejectTerminalWorkflow } from "@/modules/workflows/infrastructure/WorkflowRejectionRepository";
import { eligibilityCommandSchema } from "@/modules/workflows/WorkflowTaskRegistry";
import { ResourceConflictError } from "@/lib/resource-errors";

const input = {
  actorId: "10000000-0000-4000-8000-000000000001",
  config: { command: "AUTHORITATIVE_ELIGIBILITY", reevaluationPolicy: "NEVER" },
  correlationId: "screening-1",
  evaluatedAt: new Date("2026-10-02T08:00:00Z"),
  evaluationId: "10000000-0000-4000-8000-000000000002",
  hardFailures: [{
    applicantMessage: "Registration is required.",
    failureType: "HARD_FAIL" as const,
    reasonCode: "NOT_REGISTERED",
    ruleId: "10000000-0000-4000-8000-000000000003",
  }],
  stageInstanceId: "10000000-0000-4000-8000-000000000004",
  taskId: "10000000-0000-4000-8000-000000000005",
  workflowInstanceId: "10000000-0000-4000-8000-000000000006",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(rejectTerminalWorkflow).mockResolvedValue({
    cancelledStageInstanceIds: [input.stageInstanceId],
    cancelledTaskIds: [input.taskId],
  });
});

describe("automatic authoritative eligibility termination", () => {
  it("leaves passing, warning and soft-failure evaluations for normal decisions", async () => {
    await expect(terminateWorkflowOnEligibilityFailure({} as never, {
      ...input, hardFailures: [],
    })).resolves.toBeNull();
    expect(rejectTerminalWorkflow).not.toHaveBeenCalled();
    expect(captureApplicationTerminalStatus).not.toHaveBeenCalled();
  });

  it.each([undefined, "REJECTED", "REJECTED_INCOMPLETE"])(
    "uses the configured failure status (%s), defaulting older versions to Ineligible", async (status) => {
      const transaction = {} as never;
      const expectedStatus = status ?? "INELIGIBLE";
      await expect(terminateWorkflowOnEligibilityFailure(transaction, {
        ...input, config: { ...input.config, hardFailureStatus: status },
      })).resolves.toBe(expectedStatus);
      expect(captureApplicationTerminalStatus).toHaveBeenCalledWith(transaction,
        expect.objectContaining({
          newStatus: expectedStatus,
          failedRuleIds: [input.hardFailures[0].ruleId],
          reasonCodes: ["NOT_REGISTERED"],
          sourceIdempotencyKey: `eligibility:${input.evaluationId}`,
        }));
      expect(rejectTerminalWorkflow).toHaveBeenCalledWith(transaction,
        expect.objectContaining({
          terminalOutcome: expectedStatus,
          configuration: expect.objectContaining({
            cancelOpenStageInstances: true as const,
            cancelOpenTasks: true as const,
            publicStatusMapping: expect.objectContaining({ status: expectedStatus }),
          }),
        }));
      expect(vi.mocked(captureApplicationTerminalStatus).mock.invocationCallOrder[0])
        .toBeLessThan(vi.mocked(rejectTerminalWorkflow).mock.invocationCallOrder[0]);
    },
  );

  it("throws on a concurrent state change so the enclosing evaluation transaction rolls back", async () => {
    vi.mocked(rejectTerminalWorkflow).mockResolvedValue(null);
    await expect(terminateWorkflowOnEligibilityFailure({} as never, input))
      .rejects.toBeInstanceOf(ResourceConflictError);
  });

  it("rejects non-failure destinations and defaults old task configuration", () => {
    expect(eligibilityCommandSchema.parse(input.config).hardFailureStatus).toBe("INELIGIBLE");
    expect(eligibilityCommandSchema.safeParse({
      ...input.config, hardFailureStatus: "APPROVED",
    }).success).toBe(false);
  });
});
