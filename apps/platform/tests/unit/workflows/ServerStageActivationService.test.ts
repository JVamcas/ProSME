import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/workflows/infrastructure/StageActivationRepository",
  () => ({
    findStageInstanceStatus: vi.fn(),
    findStageIteration: vi.fn(),
    loadPriorStageContext: vi.fn(),
    loadStageActivationTasks: vi.fn(),
    lockStageActivationTarget: vi.fn(),
    persistStageActivation: vi.fn(),
    withStageActivationTransaction: vi.fn(),
  }),
);

import {
  activateStageInTransaction,
} from "@/modules/workflows/application/runtime/ServerStageActivationService";
import { basicOperators } from "@/modules/conditions/engine/BasicOperators";
import {
  findStageInstanceStatus,
  findStageIteration,
  loadPriorStageContext,
  loadStageActivationTasks,
  lockStageActivationTarget,
  persistStageActivation,
} from "@/modules/workflows/infrastructure/StageActivationRepository";

const input = {
  actorId: "11111111-1111-4111-8111-111111111111",
  correlationId: "22222222-2222-4222-8222-222222222222",
  stageDefinitionId: "33333333-3333-4333-8333-333333333333",
  workflowInstanceId: "44444444-4444-4444-8444-444444444444",
};

const passingCondition = {
  children: [{
    id: "condition-1",
    kind: "CONDITION" as const,
    leftOperand: { key: "application.requested_amount", kind: "FIELD" as const },
    operator: basicOperators.LESS_THAN_OR_EQUAL,
    rightOperand: { key: "fundingCall.maximum_amount", kind: "FIELD" as const },
  }],
  combinator: "AND" as const,
  id: "group-1",
  kind: "GROUP" as const,
};

const target = {
  application: { requestedAmount: 250_000 },
  currentStageInstanceId: null,
  entryCondition: passingCondition,
  fundingCall: { maximumAmount: 500_000 },
  repeatable: false,
  slaHours: 24,
  stageDefinitionId: input.stageDefinitionId,
  stageKey: "SCREENING",
  workflowInstanceId: input.workflowInstanceId,
};

const taskDefinition = {
  formVersionId: null,
  id: "55555555-5555-4555-8555-555555555555",
  namedUserOverrideId: null,
  roleId: "66666666-6666-4666-8666-666666666666",
  type: "CHECKLIST" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(lockStageActivationTarget).mockResolvedValue(target);
  vi.mocked(findStageIteration).mockResolvedValue(null);
  vi.mocked(findStageInstanceStatus).mockResolvedValue("ACTIVE");
  vi.mocked(loadPriorStageContext).mockResolvedValue([]);
  vi.mocked(loadStageActivationTasks).mockResolvedValue([taskDefinition]);
  vi.mocked(persistStageActivation).mockResolvedValue({
    stage: { id: "77777777-7777-4777-8777-777777777777" },
    tasks: [{ id: "88888888-8888-4888-8888-888888888888" }],
  } as never);
});

describe("server stage activation service", () => {
  it("creates one stage and its configured tasks after conditions pass", async () => {
    await expect(activateStageInTransaction({} as never, input)).resolves
      .toEqual({
        kind: "activated",
        stageInstanceId: "77777777-7777-4777-8777-777777777777",
        taskIds: ["88888888-8888-4888-8888-888888888888"],
      });
    expect(persistStageActivation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        actorId: input.actorId,
        iterationNumber: 1,
        target,
        tasks: [taskDefinition],
      }),
    );
  });

  it("does not write when the entry condition fails", async () => {
    vi.mocked(lockStageActivationTarget).mockResolvedValue({
      ...target,
      application: { requestedAmount: 750_000 },
    });

    const result = await activateStageInTransaction({} as never, input);

    expect(result.kind).toBe("entry_condition_failed");
    expect(persistStageActivation).not.toHaveBeenCalled();
  });

  it("returns the existing iteration without duplicating tasks or audit", async () => {
    vi.mocked(findStageIteration).mockResolvedValue({
      activatedAt: new Date(),
      id: "77777777-7777-4777-8777-777777777777",
      iterationNumber: 1,
      status: "ACTIVE",
    });

    await expect(activateStageInTransaction({} as never, input)).resolves
      .toEqual({
        kind: "already_active",
        stageInstanceId: "77777777-7777-4777-8777-777777777777",
      });
    expect(loadStageActivationTasks).not.toHaveBeenCalled();
    expect(persistStageActivation).not.toHaveBeenCalled();
  });

  it("rejects concurrent activation while another stage is current", async () => {
    vi.mocked(lockStageActivationTarget).mockResolvedValue({
      ...target,
      currentStageInstanceId: "99999999-9999-4999-8999-999999999999",
    });

    await expect(activateStageInTransaction({} as never, input)).resolves
      .toEqual({ kind: "stage_conflict" });
    expect(persistStageActivation).not.toHaveBeenCalled();
  });

  it("activates after the previously current stage is completed", async () => {
    vi.mocked(lockStageActivationTarget).mockResolvedValue({
      ...target,
      currentStageInstanceId: "99999999-9999-4999-8999-999999999999",
    });
    vi.mocked(findStageInstanceStatus).mockResolvedValue("COMPLETED");

    await expect(activateStageInTransaction({} as never, input)).resolves
      .toMatchObject({ kind: "activated" });
    expect(persistStageActivation).toHaveBeenCalledOnce();
  });
});
