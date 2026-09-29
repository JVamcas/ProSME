import type {
  WorkflowGraphInput,
  WorkflowStageInput,
} from "./WorkflowTypes";

function orderedStages(stages: WorkflowStageInput[]) {
  return [...stages].sort(
    (left, right) => left.displayOrder - right.displayOrder,
  );
}

export function removeWorkflowStage(
  graph: WorkflowGraphInput,
  stageKey: string,
): WorkflowGraphInput {
  const stages = orderedStages(graph.stages);
  const stageIndex = stages.findIndex((stage) => stage.stableKey === stageKey);
  const successorKey = stages[stageIndex + 1]?.stableKey;
  const remainingStages = stages
    .filter((stage) => stage.stableKey !== stageKey)
    .map((stage, index) => {
      const joinPredecessorStageKeys = stage.joinPredecessorStageKeys.filter(
        (predecessorKey) => predecessorKey !== stageKey,
      );
      return {
        ...stage,
        displayOrder: index + 1,
        initial: index === 0,
        joinPredecessorStageKeys:
          joinPredecessorStageKeys.length >= 2
            ? joinPredecessorStageKeys
            : [],
      };
    });
  const remainingTransitions = graph.transitions
    .filter((transition) => transition.sourceStageKey !== stageKey)
    .map((transition) => ({
      ...transition,
      targetStageKeys: [...new Set(
        transition.targetStageKeys.flatMap((targetStageKey) =>
          targetStageKey !== stageKey
            ? [targetStageKey]
            : successorKey
              ? [successorKey]
              : [],
        ),
      )],
    }))
    .filter(
      (transition) =>
        transition.targetStageKeys.length > 0 || transition.terminalOutcome,
    );

  return {
    stages: remainingStages,
    transitions: remainingTransitions,
  };
}
