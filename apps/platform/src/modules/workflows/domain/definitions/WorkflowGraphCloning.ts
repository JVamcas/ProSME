import type { WorkflowGraphInput } from "./WorkflowTypes";

export function cloneWorkflowGraph(
  source: WorkflowGraphInput,
): WorkflowGraphInput {
  const graph = structuredClone(source);

  return {
    stages: graph.stages.map((stage) => ({
      ...stage,
      id: undefined,
      actions: stage.actions.map((action) => ({
        ...action,
        id: undefined,
      })),
      tasks: stage.tasks.map((task) => ({
        ...task,
        id: undefined,
      })),
    })),
    transitions: graph.transitions.map((transition) => ({
      ...transition,
      id: undefined,
    })),
  };
}
