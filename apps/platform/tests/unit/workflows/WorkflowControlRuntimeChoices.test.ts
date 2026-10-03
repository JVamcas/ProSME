import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/modules/workflows/infrastructure/WorkflowControlRepository", () => ({
  recordWorkflowRework: vi.fn(),
  resumeWorkflowHold: vi.fn(),
  startWorkflowHold: vi.fn(),
}));
vi.mock(
  "@/modules/workflows/application/runtime/ServerStageActivationService",
  () => ({
    activateStageInTransaction: vi.fn(),
  }),
);
vi.mock("@/modules/workflows/infrastructure/StageCompletionRepository", () => ({
  persistStageCompletion: vi.fn(),
}));
vi.mock(
  "@/modules/workflows/application/runtime/ServerSequentialTransitionService",
  () => ({
    executeSequentialTransitionInTransaction: vi.fn(),
  }),
);
vi.mock(
  "@/modules/workflows/application/runtime/WorkflowActionOutcomeSupport",
  async (original) => ({
    ...(await original<
      typeof import("@/modules/workflows/application/runtime/WorkflowActionOutcomeSupport")
    >()),
    persistActionAndDecision: vi.fn(),
  }),
);

import { executeWorkflowControlOutcome } from "@/modules/workflows/application/runtime/ServerWorkflowControlOutcomeService";
import type { OutcomeInput } from "@/modules/workflows/application/runtime/WorkflowActionOutcomeSupport";
import { activateStageInTransaction } from "@/modules/workflows/application/runtime/ServerStageActivationService";
import { persistStageCompletion } from "@/modules/workflows/infrastructure/StageCompletionRepository";
import { executeSequentialTransitionInTransaction } from "@/modules/workflows/application/runtime/ServerSequentialTransitionService";
import { recordWorkflowRework } from "@/modules/workflows/infrastructure/WorkflowControlRepository";
import { workflowActionInputSchema } from "@/modules/workflows/domain/actions/WorkflowActionExecution";
import {
  actionFormSchema,
  actionInput,
} from "@/modules/workflows/ui/tasks/WorkflowTaskActionForm";
import { workflowActionInputMetadata } from "@/modules/workflows/domain/actions/WorkflowActionAvailability";
import type { WorkflowActionDefinition } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
import { actorId, input, target } from "./WorkflowActionExecutionFixtures";

const execution = {
  executionId: crypto.randomUUID(),
  executedAt: new Date().toISOString(),
};
const targetStageInstanceId = crypto.randomUUID();

function outcome(
  action: WorkflowActionDefinition,
  runtimeInput: OutcomeInput["command"]["input"],
): OutcomeInput {
  return {
    actorId,
    command: { ...input, input: runtimeInput },
    conditions: {
      selectedTransitionId: "transition",
      transitionEvaluations: [],
      actionEvaluation: null,
    } as never,
    conditionContext: undefined,
    configuredTransitions: {
      actionExists: true,
      transitions: [
        {
          id: "transition",
          priority: 1,
          condition: null,
          terminalOutcome: null,
          targetStages: [{ id: "target-definition", name: "Legal" }],
        },
      ],
    },
    runtimeDestination: {
      id: "e0000000-0000-4000-8000-000000000001",
      name: "Legal",
    },
    resultingRuntimeVersion: 3,
    target: { ...target, action: { ...action, id: target.action.id } },
  };
}

function action(): WorkflowActionDefinition {
  return {
    ...target.action,
    actionType: "RETURN",
    configuration: { dataHandling: "RETAIN" },
  } as WorkflowActionDefinition;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(persistStageCompletion).mockResolvedValue({
    id: target.stage.stageInstanceId,
  });
  vi.mocked(activateStageInTransaction).mockResolvedValue({
    kind: "activated",
    stageInstanceId: targetStageInstanceId,
    taskIds: [],
  });
  vi.mocked(executeSequentialTransitionInTransaction).mockResolvedValue({
    kind: "transitioned",
    executionId: "transition-execution",
    workflowStatus: "ACTIVE",
    targets: [
      {
        outcome: "ACTIVATED",
        targetStageDefinitionId: "target-definition",
        targetStageInstanceId,
        targetStageName: "Assessment",
      },
    ],
  });
});

describe("runtime control choices", () => {
  it("validates allowed choices and rejects invalid runtime values", () => {
    expect(
      workflowActionInputSchema.safeParse({
        actionType: "RETURN",
        dataHandling: "DELETE",
      }).success,
    ).toBe(false);
    expect(
      workflowActionInputSchema.safeParse({
        actionType: "REFER",
        question: "Review",
      }).success,
    ).toBe(false);
  });

  it("uses the runtime clear choice instead of the definition's retain default", async () => {
    await executeWorkflowControlOutcome(
      {} as never,
      outcome(action(), {
        actionType: "RETURN",
        dataHandling: "CLEAR",
      }),
      execution,
    );
    expect(activateStageInTransaction).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        returnContext: expect.objectContaining({ dataHandling: "CLEAR" }),
      }),
    );
    expect(executeSequentialTransitionInTransaction).not.toHaveBeenCalled();
    expect(recordWorkflowRework).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ dataHandling: "CLEAR" }),
    );
  });

  it("passes the user's Return selections into the validated runtime payload", () => {
    const definition = action();
    const available = {
      actionType: definition.actionType,
      available: true,
      key: "RETURN",
      label: "Return",
      presentation: { displayOrder: 1, variant: "outline" as const },
      requiredInput: {
        ...workflowActionInputMetadata(definition),
        destinationStages: [
          {
            id: "e0000000-0000-4000-8000-000000000001",
            name: "Legal",
            stableKey: "LEGAL",
          },
        ],
      },
      runtimeVersion: 1,
      unavailableReason: null,
    };
    const values = actionFormSchema(available).parse({
      confirmed: false,
      targetStageDefinitionId: "e0000000-0000-4000-8000-000000000001",
      dataHandling: "CLEAR",
      sourceTaskBehavior: "OPEN",
      returnToReferrer: false,
      instructions: "",
      requestDetailedInformation: false,
      editableFieldPaths: [],
      question: "",
      reason: "",
      requestedDocumentRequirementIds: [],
      reviewDate: "",
    });
    expect(
      workflowActionInputSchema.parse(actionInput(available, values)),
    ).toEqual({
      actionType: "RETURN",
      targetStageDefinitionId: "e0000000-0000-4000-8000-000000000001",
      dataHandling: "CLEAR",
    });
  });
});
