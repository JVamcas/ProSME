import type { WorkflowGraphInput } from "@/modules/workflows/domain/definitions/WorkflowTypes";

export function reachableStages(
  graph: WorkflowGraphInput,
  initialCode: string,
) {
  const visited = new Set<string>();
  const pending = [initialCode];
  while (pending.length) {
    const code = pending.shift()!;
    if (visited.has(code)) continue;
    visited.add(code);
    graph.transitions
      .filter(
        (transition) =>
          transition.sourceStageKey === code && transition.targetStageKey,
      )
      .forEach((transition) => pending.push(transition.targetStageKey!));
  }
  return visited;
}

function canReachStage(
  graph: WorkflowGraphInput,
  sourceStageKey: string,
  targetStageKey: string,
) {
  const visited = new Set<string>();
  const pending = graph.transitions.flatMap((transition) =>
    transition.sourceStageKey === sourceStageKey && transition.targetStageKey
      ? [transition.targetStageKey]
      : [],
  );
  while (pending.length) {
    const stageKey = pending.shift()!;
    if (stageKey === targetStageKey) return true;
    if (visited.has(stageKey)) continue;
    visited.add(stageKey);
    graph.transitions.forEach((transition) => {
      if (
        transition.sourceStageKey === stageKey &&
        transition.targetStageKey
      ) {
        pending.push(transition.targetStageKey);
      }
    });
  }
  return false;
}

export function stagesInCycles(graph: WorkflowGraphInput) {
  return new Set(
    graph.stages.flatMap((stage) =>
      canReachStage(graph, stage.stableKey, stage.stableKey)
        ? [stage.stableKey]
        : [],
    ),
  );
}
