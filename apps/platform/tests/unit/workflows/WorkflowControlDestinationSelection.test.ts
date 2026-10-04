import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowControlDestinationRepository",
  () => ({
    readWorkflowControlDestinations: vi.fn(),
  }),
);
vi.mock(
  "@/modules/workflows/infrastructure/WorkflowActionAvailabilityRepository",
  () => ({
    readWorkflowActionAvailabilitySource: vi.fn(),
    workflowActionAvailabilityDatabase: vi.fn(() => ({})),
  }),
);
vi.mock(
  "@/modules/workflows/infrastructure/TransitionExecutionRepository",
  () => ({
    loadSequentialTransitions: vi.fn(),
  }),
);
vi.mock(
  "@/modules/workflows/application/runtime/ServerWorkflowActionContextService",
  () => ({
    buildWorkflowActionConditionContext: vi.fn(),
  }),
);
vi.mock(
  "@/modules/workflows/application/runtime/ServerWorkflowActionReadinessService",
  () => ({
    readWorkflowActionReadiness: vi.fn().mockResolvedValue({}),
    workflowActionReadinessReason: vi.fn(() => null),
  }),
);

import { permissionCodes } from "@/auth/authorization/permissions";
import type { WorkflowActionDefinition } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
import { getWorkflowActionAvailability } from "@/modules/workflows/application/runtime/ServerWorkflowActionAvailabilityService";
import { prepareWorkflowActionRouting } from "@/modules/workflows/application/runtime/ServerWorkflowActionRoutingService";
import { readWorkflowControlDestinations } from "@/modules/workflows/infrastructure/WorkflowControlDestinationRepository";
import { readWorkflowActionAvailabilitySource } from "@/modules/workflows/infrastructure/WorkflowActionAvailabilityRepository";
import { loadSequentialTransitions } from "@/modules/workflows/infrastructure/TransitionExecutionRepository";
import { buildWorkflowActionConditionContext } from "@/modules/workflows/application/runtime/ServerWorkflowActionContextService";
import {
  source,
  actor,
  input,
} from "../../support/WorkflowActionAvailabilityFixture";
import { target } from "./WorkflowActionExecutionFixtures";

const configured = {
  id: "e0000000-0000-4000-8000-000000000001",
  name: "Assessment",
  stableKey: "ASSESSMENT",
};
const alternate = {
  id: "e0000000-0000-4000-8000-000000000002",
  name: "Legal",
  stableKey: "LEGAL",
};

function definition(): WorkflowActionDefinition & { id: string } {
  return {
    ...target.action,
    actionType: "RETURN",
    configuration: { dataHandling: "RETAIN" },
  } as WorkflowActionDefinition & { id: string };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readWorkflowControlDestinations).mockResolvedValue([
    configured,
    alternate,
  ]);
  vi.mocked(loadSequentialTransitions).mockResolvedValue({
    actionExists: true,
    transitions: [
      {
        id: "transition",
        condition: null,
        priority: 1,
        targetStages: [configured],
        terminalOutcome: null,
      },
    ],
  });
  vi.mocked(buildWorkflowActionConditionContext).mockResolvedValue({
    application: {},
    eligibility: {},
    fundingCall: {},
    stages: [],
  });
});

function available() {
  vi.mocked(readWorkflowActionAvailabilitySource).mockResolvedValue({
    ...source,
    actions: [definition()],
  } as never);
  return getWorkflowActionAvailability(
    actor(
      permissionCodes.workflowTaskAllRead,
      permissionCodes.workflowTaskAssignedProcess,
      permissionCodes.workflowTaskAssignedDecide,
    ),
    input,
  );
}

describe("runtime workflow destination selection", () => {
  it("exposes the configured Return default and alternative destinations", async () => {
    const [action] = await available();
    expect(action).toMatchObject({
      available: true,
      requiredInput: {
        defaultDestinationStageId: configured.id,
        destinationStages: [configured, alternate],
      },
    });
  });

  it("resolves the configured default when a caller omits its destination", async () => {
    vi.mocked(readWorkflowControlDestinations).mockResolvedValue([configured]);
    const result = await prepareWorkflowActionRouting(
      {} as never,
      { ...target, action: definition() },
      { actionType: "RETURN" },
    );
    expect(result.runtimeDestination).toEqual(configured);
  });

  it("accepts a chosen destination independently of the default transition", async () => {
    vi.mocked(readWorkflowControlDestinations).mockResolvedValue([alternate]);
    const result = await prepareWorkflowActionRouting(
      {} as never,
      { ...target, action: definition() },
      {
        actionType: "RETURN",
        targetStageDefinitionId: alternate.id,
      },
    );
    expect(result.runtimeDestination).toEqual(alternate);
    expect(readWorkflowControlDestinations).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        workflowInstanceId: target.stage.workflowInstanceId,
        sourceStageInstanceId: target.stage.stageInstanceId,
        targetStageDefinitionId: alternate.id,
      }),
    );
  });

  it("rejects a supplied destination outside the eligible projection", async () => {
    vi.mocked(readWorkflowControlDestinations).mockResolvedValue([]);
    await expect(
      prepareWorkflowActionRouting(
        {} as never,
        { ...target, action: definition() },
        {
          actionType: "RETURN",
          targetStageDefinitionId: alternate.id,
        },
      ),
    ).rejects.toMatchObject({ code: "INVALID_ACTION_INPUT" });
  });

  it("does not choose an arbitrary first stage when there is no default", async () => {
    vi.mocked(loadSequentialTransitions).mockResolvedValue({
      actionExists: true,
      transitions: [],
    });
    await expect(
      prepareWorkflowActionRouting(
        {} as never,
        { ...target, action: definition() },
        { actionType: "RETURN" },
      ),
    ).rejects.toMatchObject({ code: "INVALID_ACTION_INPUT" });
    expect(readWorkflowControlDestinations).not.toHaveBeenCalled();
  });

  it("disables Return with a specific reason when no previous stage is eligible", async () => {
    vi.mocked(readWorkflowControlDestinations).mockResolvedValue([]);
    const [action] = await available();
    expect(action).toMatchObject({
      available: false,
      unavailableReason: "No completed previous stage is available to reopen.",
    });
  });
  it("omits historical Refer definitions from task availability", async () => {
    vi.mocked(readWorkflowActionAvailabilitySource).mockResolvedValue({
      ...source,
      actions: [
        {
          ...definition(),
          actionType: "REFER",
          configuration: {
            returnToReferrer: true,
            sourceTaskBehavior: "BLOCKED",
          },
        },
      ],
    } as never);
    expect(
      await getWorkflowActionAvailability(
        actor(permissionCodes.workflowTaskAllRead),
        input,
      ),
    ).toEqual([]);
  });
});
