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
      checklistItems: stage.checklistItems.map((item) => ({
        ...item,
        id: undefined,
      })),
      commentFields: stage.commentFields?.map((field) => ({
        ...field,
        id: undefined,
      })) ?? [],
      documentRequirements: stage.documentRequirements.map((requirement) => ({
        ...requirement,
        id: undefined,
      })),
      scoring: stage.scoring
        ? {
            ...stage.scoring,
            criteria: stage.scoring.criteria.map((criterion) => ({
              ...criterion,
              id: undefined,
            })),
          }
        : null,
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
