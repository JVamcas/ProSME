import "server-only";

import type { StageCompletionResult } from "../../domain/runtime/StageCompletion";
import {
  evaluateStageCondition,
  normalizeStageConditionRecord,
  type StageConditionEvaluation,
} from "../../engine/StageCondition";
import { buildStageCompletionValues } from "../../engine/StageCompletionContext";
import {
  loadPriorStageContext,
} from "../../infrastructure/StageActivationRepository";
import {
  loadStageCompletionValues,
  lockStageCompletionTarget,
  type StageCompletionTransaction,
} from "../../infrastructure/StageCompletionRepository";
import {
  completeTerminalWorkflow,
  finalizeTransitionExecution,
  findTransitionExecution,
  loadSequentialTransitions,
  recordTransitionExecution,
  type ExistingTransitionExecution,
  type SequentialTransition,
  withTransitionExecutionTransaction,
} from "../../infrastructure/TransitionExecutionRepository";
import { activateStageInTransaction } from "./ServerStageActivationService";
import { completeStageInTransaction } from "./ServerStageCompletionService";

export type ExecuteSequentialTransitionInput = {
  actionKey: string;
  actorId: string;
  conditionContext?: Parameters<typeof evaluateStageCondition>[1];
  correlationId: string;
  sourceStageInstanceId: string;
};

export type SequentialTransitionResult =
  | { kind: "action_not_found" | "source_stage_not_found" | "transition_not_found" }
  | { kind: "already_executed"; execution: ExistingTransitionExecution }
  | {
      evaluations: StageConditionEvaluation[];
      kind: "transition_condition_failed";
    }
  | { completion: StageCompletionResult; kind: "source_stage_not_completed" }
  | {
      executionId: string;
      kind: "target_entry_condition_failed";
      targetStageName: string | null;
    }
  | {
      executionId: string;
      kind: "transitioned";
      targetStageInstanceId: string;
      targetStageName: string | null;
      workflowStatus: "ACTIVE";
    }
  | {
      executionId: string;
      kind: "workflow_completed";
      workflowStatus: "COMPLETED";
    }
  | { kind: "target_activation_failed" };

type TransitionSelection =
  | {
      evaluation: StageConditionEvaluation;
      transition: SequentialTransition;
    }
  | { evaluations: StageConditionEvaluation[] };

function selectTransition(
  transitions: SequentialTransition[],
  context: Parameters<typeof evaluateStageCondition>[1],
): TransitionSelection {
  const evaluations: StageConditionEvaluation[] = [];
  for (const transition of transitions) {
    const evaluation = evaluateStageCondition(transition.condition, context);
    evaluations.push(evaluation);
    if (evaluation.passed) return { evaluation, transition };
  }
  return { evaluations };
}

function completedStage(completion: StageCompletionResult) {
  return completion.kind === "completed"
    || completion.kind === "already_completed";
}

export async function executeSequentialTransitionInTransaction(
  transaction: StageCompletionTransaction,
  input: ExecuteSequentialTransitionInput,
): Promise<SequentialTransitionResult> {
  const replay = await findTransitionExecution(
    transaction,
    input.sourceStageInstanceId,
  );
  if (replay) return { execution: replay, kind: "already_executed" };

  const source = await lockStageCompletionTarget(
    transaction,
    input.sourceStageInstanceId,
  );
  if (!source) {
    const concurrentReplay = await findTransitionExecution(
      transaction,
      input.sourceStageInstanceId,
    );
    return concurrentReplay
      ? { execution: concurrentReplay, kind: "already_executed" }
      : { kind: "source_stage_not_found" };
  }
  const configured = await loadSequentialTransitions(transaction, {
    actionKey: input.actionKey,
    sourceStageDefinitionId: source.stageDefinitionId,
    workflowVersionId: source.workflowVersionId,
  });
  if (!configured.actionExists) return { kind: "action_not_found" };
  if (!configured.transitions.length) return { kind: "transition_not_found" };

  // A PostgreSQL transaction uses one connection, so dependent context reads
  // are deliberately sequenced here.
  let conditionContext = input.conditionContext;
  if (!conditionContext) {
    const priorStages = await loadPriorStageContext(
      transaction,
      source.workflowInstanceId,
    );
    const valueRows = await loadStageCompletionValues(
      transaction,
      source.stageInstanceId,
    );
    conditionContext = {
      application: normalizeStageConditionRecord(source.application),
      eligibility: normalizeStageConditionRecord(source.eligibility),
      fundingCall: normalizeStageConditionRecord(source.fundingCall),
      stages: [
        ...priorStages
          .filter((stage) => stage.stableKey !== source.stageKey)
          .map((stage) => ({
            stableKey: stage.stableKey,
            values: normalizeStageConditionRecord(stage.values),
          })),
        {
          stableKey: source.stageKey,
          values: normalizeStageConditionRecord(
            buildStageCompletionValues(valueRows),
          ),
        },
      ],
    };
  }
  const selected = selectTransition(configured.transitions, conditionContext);
  if (!("transition" in selected)) {
    return {
      evaluations: selected.evaluations,
      kind: "transition_condition_failed",
    };
  }

  const completion = await completeStageInTransaction(transaction, {
    actorId: input.actorId,
    correlationId: input.correlationId,
    stageInstanceId: input.sourceStageInstanceId,
  });
  if (!completedStage(completion)) {
    return { completion, kind: "source_stage_not_completed" };
  }
  const execution = await recordTransitionExecution(transaction, {
    actionKey: input.actionKey,
    actorId: input.actorId,
    conditionEvaluation: selected.evaluation,
    correlationId: input.correlationId,
    sourceStageInstanceId: source.stageInstanceId,
    transition: selected.transition,
    workflowInstanceId: source.workflowInstanceId,
  });

  if (!selected.transition.targetStageDefinitionId) {
    await completeTerminalWorkflow(
      transaction,
      source.workflowInstanceId,
      new Date(),
    );
    await finalizeTransitionExecution(transaction, {
      actionKey: input.actionKey,
      actorId: input.actorId,
      correlationId: input.correlationId,
      executionId: execution.id,
      outcome: "WORKFLOW_COMPLETED",
      sourceStageInstanceId: source.stageInstanceId,
      targetStageInstanceId: null,
      transition: selected.transition,
      workflowInstanceId: source.workflowInstanceId,
    });
    return {
      executionId: execution.id,
      kind: "workflow_completed",
      workflowStatus: "COMPLETED",
    };
  }

  const activation = await activateStageInTransaction(transaction, {
    actorId: input.actorId,
    correlationId: input.correlationId,
    stageDefinitionId: selected.transition.targetStageDefinitionId,
    workflowInstanceId: source.workflowInstanceId,
  });
  if (activation.kind === "entry_condition_failed") {
    await finalizeTransitionExecution(transaction, {
      actionKey: input.actionKey,
      actorId: input.actorId,
      correlationId: input.correlationId,
      executionId: execution.id,
      outcome: "TARGET_ENTRY_CONDITION_FAILED",
      sourceStageInstanceId: source.stageInstanceId,
      targetStageInstanceId: null,
      transition: selected.transition,
      workflowInstanceId: source.workflowInstanceId,
    });
    return {
      executionId: execution.id,
      kind: "target_entry_condition_failed",
      targetStageName: selected.transition.targetStageName,
    };
  }
  if (activation.kind !== "activated" && activation.kind !== "already_active") {
    return { kind: "target_activation_failed" };
  }
  await finalizeTransitionExecution(transaction, {
    actionKey: input.actionKey,
    actorId: input.actorId,
    correlationId: input.correlationId,
    executionId: execution.id,
    outcome: "TARGET_ACTIVATED",
    sourceStageInstanceId: source.stageInstanceId,
    targetStageInstanceId: activation.stageInstanceId,
    transition: selected.transition,
    workflowInstanceId: source.workflowInstanceId,
  });
  return {
    executionId: execution.id,
    kind: "transitioned",
    targetStageInstanceId: activation.stageInstanceId,
    targetStageName: selected.transition.targetStageName,
    workflowStatus: "ACTIVE",
  };
}

export function executeSequentialTransition(
  input: ExecuteSequentialTransitionInput,
) {
  return withTransitionExecutionTransaction((transaction) =>
    executeSequentialTransitionInTransaction(transaction, input)
  );
}
