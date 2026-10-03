import "server-only";

import { isRuntimeWorkflowControlAction } from "../../domain/actions/WorkflowActionDefinition";
import type { WorkflowActionInput } from "../../domain/actions/WorkflowActionExecution";
import { readWorkflowControlDestinations } from "../../infrastructure/WorkflowControlDestinationRepository";
import { configuredActionTargetsAreValid } from "../../infrastructure/WorkflowActionTargetRepository";
import { loadSequentialTransitions } from "../../infrastructure/TransitionExecutionRepository";
import type {
  WorkflowActionExecutionTarget,
  WorkflowActionExecutionTransaction,
} from "../../infrastructure/WorkflowActionExecutionRepository";
import { buildWorkflowActionConditionContext } from "./ServerWorkflowActionContextService";
import { evaluateWorkflowActionConditions } from "./WorkflowActionPolicy";
import { failWorkflowAction } from "./WorkflowActionOutcomeSupport";

export async function prepareWorkflowActionRouting(
  transaction: WorkflowActionExecutionTransaction,
  target: WorkflowActionExecutionTarget,
  input: WorkflowActionInput,
) {
  const runtimeControl = isRuntimeWorkflowControlAction(
    target.action.actionType,
  );
  // Reads are queued on this PostgreSQL transaction connection. The default
  // destination depends on evaluating the configured transition conditions.
  const conditionContext = await buildWorkflowActionConditionContext(
    transaction,
    target.stage,
  );
  const configuredTransitions = await loadSequentialTransitions(transaction, {
    actionKey: target.action.stableKey,
    sourceStageDefinitionId: target.stage.stageDefinitionId,
    workflowVersionId: target.stage.workflowVersionId,
  });
  const configuredConditions = evaluateWorkflowActionConditions(
    target.action,
    configuredTransitions.transitions,
    conditionContext,
  );
  const configuredDestination = configuredTransitions.transitions.find(
    (transition) => transition.id === configuredConditions.selectedTransitionId,
  )?.targetStages[0];
  let runtimeDestination = null;
  if (runtimeControl && input.actionType === "RETURN") {
    const destinationId =
      input.targetStageDefinitionId ?? configuredDestination?.id;
    if (!destinationId) {
      failWorkflowAction("INVALID_ACTION_INPUT", "Choose a destination stage.");
    }
    const destinations = await readWorkflowControlDestinations(transaction, {
      actionType: input.actionType,
      sourceStageInstanceId: target.stage.stageInstanceId,
      workflowInstanceId: target.stage.workflowInstanceId,
      targetStageDefinitionId: destinationId,
    });
    runtimeDestination = destinations[0] ?? null;
    if (!runtimeDestination) {
      failWorkflowAction(
        "INVALID_ACTION_INPUT",
        "Return must target the previous completed stage in the workflow.",
      );
    }
  }
  const targetsValid = runtimeControl
    ? Boolean(runtimeDestination)
    : await configuredActionTargetsAreValid(transaction, target);
  const conditions = runtimeControl
    ? evaluateWorkflowActionConditions(target.action, [], conditionContext)
    : configuredConditions;
  return {
    targetsValid,
    conditionContext,
    configuredTransitions,
    conditions,
    runtimeDestination,
  };
}
