import "server-only";

import { systemSeedUserId } from "@/platform/database/SystemSeedPrincipal";
import type { WorkflowDeadlineCandidate } from "../../domain/runtime/WorkflowDeadline";
import { workflowActionDefinitionSchema } from "../../domain/actions/WorkflowActionSchemas";
import type { WorkflowActionExecutionTransaction } from "../../infrastructure/WorkflowActionExecutionRepository";
import type { StageCompletionTarget } from "../../infrastructure/StageCompletionRepository";
import { loadSequentialTransitions } from "../../infrastructure/TransitionExecutionRepository";
import { configuredActionTargetsAreValid } from "../../infrastructure/WorkflowActionTargetRepository";
import { recordWorkflowRework } from "../../infrastructure/WorkflowControlRepository";
import {
  loadBoundDeadlineActions,
  recordScheduledWorkflowAction,
  cancelSourceForScheduledReturn,
  hasActiveDeadlineEscalation,
} from "../../infrastructure/WorkflowDeadlineActionRepository";
import { transferWorkflowEscalation } from "./ServerWorkflowEscalationService";
import { buildWorkflowActionConditionContext } from "./ServerWorkflowActionContextService";
import { evaluateWorkflowActionConditions } from "./WorkflowActionPolicy";
import { activateStageInTransaction } from "./ServerStageActivationService";

export async function executeWorkflowDeadlineAction(
  transaction: WorkflowActionExecutionTransaction,
  input: {
    actionType: "ESCALATE" | "RETURN";
    candidate: WorkflowDeadlineCandidate;
    correlationId: string;
    occurredAt: Date;
    stage: StageCompletionTarget;
  },
) {
  const { candidate, stage } = input;
  // SLA breaches notify staff; escalation is an explicit manual action.
  if (candidate.kind === "SLA_BREACH") return;
  const actions = await loadBoundDeadlineActions(transaction, candidate, input.actionType);
  if (actions.length !== 1) {
    throw new Error("Exactly one enabled task-bound deadline action is required.");
  }
  const action = { ...workflowActionDefinitionSchema.parse(actions[0]), id: actions[0]!.id };
  if (action.actionType !== "ESCALATE" && action.actionType !== "RETURN") {
    throw new Error("Unsupported scheduled workflow action.");
  }
  const [validTargets, context, configured] = await Promise.all([
    configuredActionTargetsAreValid(transaction, { action, stage }),
    buildWorkflowActionConditionContext(transaction, stage, true),
    loadSequentialTransitions(transaction, {
      actionKey: action.stableKey,
      sourceStageDefinitionId: stage.stageDefinitionId,
      workflowVersionId: stage.workflowVersionId,
    }),
  ]);
  const conditions = evaluateWorkflowActionConditions(action, configured.transitions, context);
  if (!validTargets || !conditions.available) {
    throw new Error("The configured deadline action requirements are not satisfied.");
  }
  const executionId = crypto.randomUUID();
  if (action.actionType === "ESCALATE") {
    if (!candidate.taskId) throw new Error("An escalation requires a task.");
    if (await hasActiveDeadlineEscalation(transaction, candidate.taskId)) {
      throw new Error("Resolve the existing escalation before applying RFI expiry escalation.");
    }
    await recordScheduledWorkflowAction(transaction, {
      ...input,
      action,
      conditionEvaluation: conditions.actionEvaluation,
      executionId,
      rowVersion: stage.rowVersion!,
    });
    const escalated = await transferWorkflowEscalation(transaction, {
      actionExecutionId: executionId,
      actorId: systemSeedUserId,
      comment: `Scheduled ${candidate.kind}`,
      reason: `Scheduled ${candidate.kind}`,
      configuration: action.configuration,
      correlationId: input.correlationId,
      stageInstanceId: candidate.stageInstanceId,
      taskId: candidate.taskId,
      workflowInstanceId: candidate.workflowInstanceId,
      triggerOverride: candidate.kind === "RFI_EXPIRED" ? "RFI_EXPIRY" : undefined,
    });
    if (!escalated) throw new Error("The scheduled task could not be escalated.");
    return;
  }
  const selected = configured.transitions.find(
    (transition) => transition.id === conditions.selectedTransitionId,
  );
  const target = selected?.targetStages[0];
  if (!selected || selected.targetStages.length !== 1 || !target) {
    throw new Error("The scheduled return must have one configured rework target.");
  }
  const activation = await activateStageInTransaction(transaction, {
    actorId: systemSeedUserId,
    correlationId: input.correlationId,
    iterationStrategy: "NEXT",
    returnContext: {
      actionExecutionId: executionId,
      continuationStageInstanceId: candidate.stageInstanceId,
      dataHandling: action.configuration.dataHandling,
      reason: "Information request deadline expired.",
      sourceStageInstanceId: candidate.stageInstanceId,
      sourceTaskId: candidate.taskId,
    },
    stageDefinitionId: target.id,
    workflowInstanceId: candidate.workflowInstanceId,
  });
  if (activation.kind !== "activated") {
    throw new Error("The configured deadline rework stage could not be activated.");
  }
  await recordScheduledWorkflowAction(transaction, {
    ...input,
    action,
    conditionEvaluation: conditions.actionEvaluation,
    executionId,
    rowVersion: stage.rowVersion!,
    targetStageInstanceId: activation.stageInstanceId,
  });
  await recordWorkflowRework(transaction, {
    actionExecutionId: executionId,
    actorId: systemSeedUserId,
    continuationStageInstanceId: candidate.stageInstanceId,
    correlationId: input.correlationId,
    dataHandling: action.configuration.dataHandling,
    reason: "Information request deadline expired.",
    sourceStageInstanceId: candidate.stageInstanceId,
    sourceTaskId: candidate.taskId,
    targetStageInstanceId: activation.stageInstanceId,
    workflowInstanceId: candidate.workflowInstanceId,
  });
  await cancelSourceForScheduledReturn(transaction, candidate, input.occurredAt, input.correlationId);
}
