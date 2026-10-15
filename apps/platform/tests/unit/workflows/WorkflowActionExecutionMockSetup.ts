import { vi } from "vitest";
import {
  prepareWorkflowActionNotifications,
  captureWorkflowActionNotifications,
} from "@/modules/workflows/application/runtime/ServerWorkflowActionNotificationService";
import { readWorkflowActionTaskReadiness } from "@/modules/workflows/infrastructure/WorkflowActionTaskReadinessRepository";
import { evaluateStageQuorum } from "@/modules/workflows/infrastructure/WorkflowQuorumRepository";
import { buildWorkflowActionConditionContext } from "@/modules/workflows/application/runtime/ServerWorkflowActionContextService";
import { loadSequentialTransitions } from "@/modules/workflows/infrastructure/TransitionExecutionRepository";
import {
  claimWorkflowActionRuntimeVersion,
  completeActionTask,
  findWorkflowActionExecution,
  lockWorkflowActionExecutionTarget,
} from "@/modules/workflows/infrastructure/WorkflowActionExecutionRepository";
import {
  withWorkflowActionExecutionTransaction,
  workflowActionExecutionDatabase,
} from "@/modules/workflows/infrastructure/WorkflowActionExecutionConnection";
import { configuredActionTargetsAreValid } from "@/modules/workflows/infrastructure/WorkflowActionTargetRepository";
import { executeSequentialTransitionInTransaction } from "@/modules/workflows/application/runtime/ServerSequentialTransitionService";
import { target, taskId } from "./WorkflowActionExecutionFixtures";

export function resetWorkflowActionExecutionMocks() {
  vi.clearAllMocks();
  vi.mocked(prepareWorkflowActionNotifications).mockResolvedValue([]);
  vi.mocked(captureWorkflowActionNotifications).mockResolvedValue(undefined);
  vi.mocked(evaluateStageQuorum).mockResolvedValue(true);
  vi.mocked(readWorkflowActionTaskReadiness).mockResolvedValue({
    hasOpenRfi: false,
    workReady: true,
  });
  vi.mocked(workflowActionExecutionDatabase).mockReturnValue({} as never);
  vi.mocked(findWorkflowActionExecution).mockResolvedValue(null);
  vi.mocked(withWorkflowActionExecutionTransaction).mockImplementation(
    async (work) => work({} as never),
  );
  vi.mocked(lockWorkflowActionExecutionTarget).mockResolvedValue(target);
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
  vi.mocked(claimWorkflowActionRuntimeVersion).mockResolvedValue(3);
  vi.mocked(completeActionTask).mockResolvedValue({ id: taskId });
  vi.mocked(configuredActionTargetsAreValid).mockResolvedValue(true);
  vi.mocked(executeSequentialTransitionInTransaction).mockResolvedValue({
    executionId: "f0000000-0000-4000-8000-000000000001",
    kind: "transitioned",
    targets: [
      {
        outcome: "ACTIVATED",
        targetStageDefinitionId: "f0000000-0000-4000-8000-000000000003",
        targetStageInstanceId: "f0000000-0000-4000-8000-000000000002",
        targetStageName: "Next stage",
      },
    ],
    workflowStatus: "ACTIVE",
  });
}
