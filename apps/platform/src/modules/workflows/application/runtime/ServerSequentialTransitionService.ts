import "server-only";

import { terminalOutcomeApplicantStatus } from "../../domain/transitions/WorkflowTerminalOutcome";
import type { StageCompletionResult } from "../../domain/runtime/StageCompletion";
import {
  evaluateStageCondition,
  normalizeStageConditionRecord,
  type StageConditionEvaluation,
} from "../../engine/StageCondition";
import { buildStageCompletionValues } from "../../engine/StageCompletionContext";
import { loadPriorStageContext } from "../../infrastructure/StageActivationRepository";
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
  type TransitionTargetOutcome,
  withTransitionExecutionTransaction,
} from "../../infrastructure/TransitionExecutionRepository";
import { activateStageInTransaction } from "./ServerStageActivationService";
import { completeStageInTransaction } from "./ServerStageCompletionService";

export type ExecuteSequentialTransitionInput = {
  actionKey: string;
  actorId: string;
  conditionSelection?: {
    selectedTransitionId: string | null;
    transitionEvaluations: StageConditionEvaluation[];
  };
  conditionContext?: Parameters<typeof evaluateStageCondition>[1];
  correlationId: string;
  sourceStageInstanceId: string;
  targetActivation?: {
    iterationStrategy: "FIRST" | "NEXT";
    referralContext?: Record<string, unknown> | null;
    returnContext?: Record<string, unknown> | null;
  };
};

export type SequentialTransitionResult =
  | {
      kind:
        "action_not_found" | "source_stage_not_found" | "transition_not_found";
    }
  | { kind: "already_executed"; execution: ExistingTransitionExecution }
  | {
      evaluations: StageConditionEvaluation[];
      kind: "transition_condition_failed";
    }
  | { completion: StageCompletionResult; kind: "source_stage_not_completed" }
  | {
      executionId: string;
      kind: "transitioned";
      targets: TransitionTargetOutcome[];
      workflowStatus: "ACTIVE";
    }
  | {
      executionId: string;
      kind: "workflow_completed";
      workflowStatus: "COMPLETED";
    }
  | { kind: "target_activation_failed" };

type TransitionSelection =
  | { evaluation: StageConditionEvaluation; transition: SequentialTransition }
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

function selectEvaluatedTransition(
  transitions: SequentialTransition[],
  selection: NonNullable<
    ExecuteSequentialTransitionInput["conditionSelection"]
  >,
): TransitionSelection {
  if (!selection.selectedTransitionId) {
    return { evaluations: selection.transitionEvaluations };
  }
  const transitionIndex = transitions.findIndex(
    (transition) => transition.id === selection.selectedTransitionId,
  );
  const evaluation = selection.transitionEvaluations[transitionIndex];
  const transition = transitions[transitionIndex];
  return transition && evaluation?.passed
    ? { evaluation, transition }
    : { evaluations: selection.transitionEvaluations };
}

function completedStage(completion: StageCompletionResult) {
  return (
    completion.kind === "completed" || completion.kind === "already_completed"
  );
}

async function activateTransitionTargets(
  transaction: StageCompletionTransaction,
  input: ExecuteSequentialTransitionInput,
  transition: SequentialTransition,
  workflowInstanceId: string,
): Promise<TransitionTargetOutcome[] | null> {
  const targets: TransitionTargetOutcome[] = [];
  for (const target of transition.targetStages) {
    const activation = await activateStageInTransaction(transaction, {
      actorId: input.actorId,
      correlationId: input.correlationId,
      iterationStrategy: input.targetActivation?.iterationStrategy,
      referralContext: input.targetActivation?.referralContext,
      returnContext: input.targetActivation?.returnContext,
      stageDefinitionId: target.id,
      workflowInstanceId,
    });
    if (activation.kind === "entry_condition_failed") {
      targets.push({
        outcome: "ENTRY_CONDITION_FAILED",
        targetStageDefinitionId: target.id,
        targetStageInstanceId: null,
        targetStageName: target.name,
      });
      continue;
    }
    if (activation.kind === "join_pending") {
      targets.push({
        incompletePredecessorStageKeys:
          activation.incompletePredecessorStageKeys,
        outcome: "JOIN_PENDING",
        targetStageDefinitionId: target.id,
        targetStageInstanceId: null,
        targetStageName: target.name,
      });
      continue;
    }
    if (
      activation.kind !== "activated" &&
      activation.kind !== "already_active"
    ) {
      return null;
    }
    targets.push({
      outcome: activation.kind === "activated" ? "ACTIVATED" : "ALREADY_ACTIVE",
      targetStageDefinitionId: target.id,
      targetStageInstanceId: activation.stageInstanceId,
      targetStageName: target.name,
    });
  }
  return targets;
}

function targetExecutionOutcome(targets: TransitionTargetOutcome[]) {
  if (
    targets.some(
      (target) =>
        target.outcome === "ACTIVATED" || target.outcome === "ALREADY_ACTIVE",
    )
  )
    return "TARGET_ACTIVATED" as const;
  if (targets.some((target) => target.outcome === "JOIN_PENDING")) {
    return "TARGET_JOIN_PENDING" as const;
  }
  return "TARGET_ENTRY_CONDITION_FAILED" as const;
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
      eligibility: normalizeStageConditionRecord(source.eligibility ?? {}),
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
  const selected = input.conditionSelection
    ? selectEvaluatedTransition(
        configured.transitions,
        input.conditionSelection,
      )
    : selectTransition(configured.transitions, conditionContext);
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

  if (selected.transition.terminalOutcome) {
    const completed = await completeTerminalWorkflow(
      transaction,
      source.workflowInstanceId,
      new Date(),
      selected.transition.terminalOutcome,
      terminalOutcomeApplicantStatus(
        selected.transition.terminalOutcome,
        selected.transition.terminalApplicantStatus,
      ),
    );
    if (!completed) return { kind: "target_activation_failed" };
    await finalizeTransitionExecution(transaction, {
      actionKey: input.actionKey,
      actorId: input.actorId,
      correlationId: input.correlationId,
      executionId: execution.id,
      outcome: "WORKFLOW_COMPLETED",
      sourceStageInstanceId: source.stageInstanceId,
      targets: [],
      transition: selected.transition,
      workflowInstanceId: source.workflowInstanceId,
    });
    return {
      executionId: execution.id,
      kind: "workflow_completed",
      workflowStatus: "COMPLETED",
    };
  }

  const targets = await activateTransitionTargets(
    transaction,
    input,
    selected.transition,
    source.workflowInstanceId,
  );
  if (!targets) return { kind: "target_activation_failed" };
  await finalizeTransitionExecution(transaction, {
    actionKey: input.actionKey,
    actorId: input.actorId,
    correlationId: input.correlationId,
    executionId: execution.id,
    outcome: targetExecutionOutcome(targets),
    sourceStageInstanceId: source.stageInstanceId,
    targets,
    transition: selected.transition,
    workflowInstanceId: source.workflowInstanceId,
  });
  return {
    executionId: execution.id,
    kind: "transitioned",
    targets,
    workflowStatus: "ACTIVE",
  };
}

export function executeSequentialTransition(
  input: ExecuteSequentialTransitionInput,
) {
  return withTransitionExecutionTransaction((transaction) =>
    executeSequentialTransitionInTransaction(transaction, input),
  );
}
