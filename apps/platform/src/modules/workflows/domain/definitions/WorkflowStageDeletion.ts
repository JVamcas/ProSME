import type {
  WorkflowGraphInput,
  WorkflowStageInput,
  WorkflowTransitionInput,
} from "./WorkflowTypes";

export type WorkflowStageIncomingRoute = {
  actionLabel: string;
  predecessorName: string;
  singleTarget: boolean;
  successorStages: WorkflowStageInput[];
  transition: WorkflowTransitionInput;
  transitionIndex: number;
};

export type WorkflowStageDeletionInspection = {
  incomingRoutes: WorkflowStageIncomingRoute[];
  outgoingTransitions: WorkflowTransitionInput[];
  stage: WorkflowStageInput;
  successorStages: WorkflowStageInput[];
};

export type WorkflowStageReconnection = {
  targetStageKeys: string[];
  transitionIndex: number;
};

function orderedStages(stages: WorkflowStageInput[]) {
  return [...stages].sort(
    (left, right) => left.displayOrder - right.displayOrder,
  );
}

export function inspectWorkflowStageDeletion(
  graph: WorkflowGraphInput,
  stageKey: string,
): WorkflowStageDeletionInspection {
  const stage = graph.stages.find(
    (candidate) => candidate.stableKey === stageKey,
  );
  if (!stage) throw new Error("The workflow stage no longer exists.");

  const outgoingTransitions = graph.transitions.filter(
    (transition) => transition.sourceStageKey === stageKey,
  );
  const successorKeys = new Set(
    outgoingTransitions.flatMap((transition) => transition.targetStageKeys),
  );
  successorKeys.delete(stageKey);
  const successorStages = orderedStages(
    graph.stages.filter((candidate) => successorKeys.has(candidate.stableKey)),
  );

  const incomingRoutes = graph.transitions.flatMap((transition, index) => {
    if (
      transition.sourceStageKey === stageKey
      || !transition.targetStageKeys.includes(stageKey)
    ) {
      return [];
    }
    const predecessor = graph.stages.find(
      (candidate) => candidate.stableKey === transition.sourceStageKey,
    );
    const action = predecessor?.actions.find(
      (candidate) => candidate.stableKey === transition.actionKey,
    );
    return [
      {
        actionLabel: action?.label ?? transition.actionKey,
        predecessorName: predecessor?.name ?? transition.sourceStageKey,
        singleTarget:
          action?.actionType === "RETURN" || action?.actionType === "REFER",
        successorStages:
          action?.actionType === "RETURN" || action?.actionType === "REFER"
            ? successorStages.filter((successor) => successor.repeatable)
            : successorStages,
        transition,
        transitionIndex: index,
      },
    ];
  });

  return {
    incomingRoutes,
    outgoingTransitions,
    stage,
    successorStages,
  };
}

function remainingStages(
  graph: WorkflowGraphInput,
  stageKey: string,
): WorkflowStageInput[] {
  return orderedStages(graph.stages)
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
}

function replacementTransitions(
  inspection: WorkflowStageDeletionInspection,
  reconnections: WorkflowStageReconnection[],
): WorkflowTransitionInput[] {
  const incomingByIndex = new Map(
    inspection.incomingRoutes.map((route) => [route.transitionIndex, route]),
  );

  return reconnections.flatMap((reconnection) => {
    const route = incomingByIndex.get(reconnection.transitionIndex);
    const targetStageKeys = [...new Set(reconnection.targetStageKeys)];
    if (!route || targetStageKeys.length === 0) return [];
    const successorKeys = new Set(
      route.successorStages.map((stage) => stage.stableKey),
    );
    if (targetStageKeys.some((target) => !successorKeys.has(target))) {
      throw new Error(
        "A selected reconnection target is not a valid successor.",
      );
    }
    return [
      {
        ...route.transition,
        id: undefined,
        targetStageKeys,
        terminalOutcome: null,
      },
    ];
  });
}

export function removeWorkflowStage(
  graph: WorkflowGraphInput,
  stageKey: string,
  reconnections: WorkflowStageReconnection[] = [],
): WorkflowGraphInput {
  const inspection = inspectWorkflowStageDeletion(graph, stageKey);
  const connectedTransitionIndexes = new Set(
    graph.transitions.flatMap((transition, index) =>
      transition.sourceStageKey === stageKey
      || transition.targetStageKeys.includes(stageKey)
        ? [index]
        : [],
    ),
  );

  return {
    stages: remainingStages(graph, stageKey),
    transitions: [
      ...graph.transitions.filter(
        (_transition, index) => !connectedTransitionIndexes.has(index),
      ),
      ...replacementTransitions(inspection, reconnections),
    ],
  };
}
