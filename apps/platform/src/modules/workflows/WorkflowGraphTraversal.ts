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

export function hasWorkflowCycle(graph: WorkflowGraphInput) {
  const active = new Set<string>();
  const complete = new Set<string>();
  function visit(code: string): boolean {
    if (active.has(code)) return true;
    if (complete.has(code)) return false;
    active.add(code);
    const cyclic = graph.transitions
      .filter(
        (transition) =>
          transition.sourceStageKey === code && transition.targetStageKey,
      )
      .some((transition) => visit(transition.targetStageKey!));
    active.delete(code);
    complete.add(code);
    return cyclic;
  }
  return graph.stages.some((stage) => visit(stage.stableKey));
}
