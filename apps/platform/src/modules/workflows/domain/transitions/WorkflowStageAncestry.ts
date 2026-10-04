import { isRuntimeWorkflowControlAction } from "../actions/WorkflowActionDefinition";
import type { WorkflowGraphInput } from "../definitions/WorkflowTypes";

/** Earlier stages follow progression paths, independently of display order. */
export function earlierWorkflowStageKeys(
  graph: WorkflowGraphInput,
  sourceStageKey: string,
): Set<string> {
  const predecessors = new Map<string, Set<string>>();
  const successors = new Map<string, Set<string>>();
  const stages = new Map(graph.stages.map((stage) => [stage.stableKey, stage]));
  for (const transition of graph.transitions) {
    const action = stages
      .get(transition.sourceStageKey)
      ?.actions.find(
        (candidate) => candidate.stableKey === transition.actionKey,
      );
    if (
      !action ||
      isRuntimeWorkflowControlAction(action.actionType) ||
      action.actionType === "REFER"
    )
      continue;
    for (const target of transition.targetStageKeys) {
      const previous = predecessors.get(target) ?? new Set<string>();
      previous.add(transition.sourceStageKey);
      predecessors.set(target, previous);
      const next =
        successors.get(transition.sourceStageKey) ?? new Set<string>();
      next.add(target);
      successors.set(transition.sourceStageKey, next);
    }
  }
  const upstream = reachableStageKeys(predecessors, sourceStageKey);
  const downstream = reachableStageKeys(successors, sourceStageKey);
  return new Set([...upstream].filter((key) => !downstream.has(key)));
}

export function previousWorkflowStageKeys(
  graph: WorkflowGraphInput,
  sourceStageKey: string,
): Set<string> {
  const earlier = earlierWorkflowStageKeys(graph, sourceStageKey);
  return new Set(
    graph.transitions.flatMap((transition) => {
      if (!transition.targetStageKeys.includes(sourceStageKey)) return [];
      const action = graph.stages
        .find((stage) => stage.stableKey === transition.sourceStageKey)
        ?.actions.find(
          (candidate) => candidate.stableKey === transition.actionKey,
        );
      return action &&
        action.actionType !== "RETURN" &&
        action.actionType !== "REFER" &&
        earlier.has(transition.sourceStageKey)
        ? [transition.sourceStageKey]
        : [];
    }),
  );
}

function reachableStageKeys(
  edges: Map<string, Set<string>>,
  sourceStageKey: string,
): Set<string> {
  const visited = new Set([sourceStageKey]);
  const pending = [sourceStageKey];
  while (pending.length > 0) {
    const current = pending.pop()!;
    for (const next of edges.get(current) ?? []) {
      if (visited.has(next)) continue;
      visited.add(next);
      pending.push(next);
    }
  }
  return visited;
}
