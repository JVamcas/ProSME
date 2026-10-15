import type { WorkflowActionDefinition } from "./WorkflowActionDefinition";
import { reconcileWorkflowStageActionBindings } from "./WorkflowActionBindingPolicy";
import type {
  WorkflowGraphInput,
  WorkflowStageInput,
} from "../definitions/WorkflowTypes";
import type { WorkflowTransitionDefinition } from "../transitions/WorkflowTransitionDefinition";

export type WorkflowActionChange = {
  stageKey: string;
  actionKey: string | null;
  action: WorkflowActionDefinition;
  taskStableKeys: readonly string[];
  routes: WorkflowTransitionDefinition[];
};

export function changedWorkflowActionStage(
  stage: WorkflowStageInput,
  change: WorkflowActionChange,
): WorkflowStageInput {
  const selected = new Set(change.taskStableKeys);
  const reconciled = reconcileWorkflowStageActionBindings(stage, {
    ...stage,
    actions: change.actionKey
      ? stage.actions.map((action) =>
          action.stableKey === change.actionKey ? change.action : action,
        )
      : [...stage.actions, change.action],
    tasks: stage.tasks.map((task) => ({
      ...task,
      actionKeys: [
        ...task.actionKeys.filter((key) => key !== change.action.stableKey),
        ...(selected.has(task.stableKey) ? [change.action.stableKey] : []),
      ],
    })),
  });
  const boundTasks = new Set(
    reconciled.tasks
      .filter((task) => task.actionKeys.includes(change.action.stableKey))
      .map((task) => task.stableKey),
  );
  return {
    ...reconciled,
    tasks: stage.tasks.map((task) => {
      const wasBound = task.actionKeys.includes(change.action.stableKey);
      const isBound = boundTasks.has(task.stableKey);
      if (wasBound === isBound) return task;
      return {
        ...task,
        actionKeys: isBound
          ? [...task.actionKeys, change.action.stableKey]
          : task.actionKeys.filter((key) => key !== change.action.stableKey),
      };
    }),
  };
}

export function changedWorkflowActionGraph(
  graph: WorkflowGraphInput,
  stage: WorkflowStageInput,
  change: WorkflowActionChange,
): WorkflowGraphInput {
  return {
    stages: graph.stages.map((current) =>
      current.stableKey === stage.stableKey ? stage : current,
    ),
    transitions: [
      ...graph.transitions.filter(
        (route) =>
          route.sourceStageKey !== change.stageKey ||
          route.actionKey !== change.action.stableKey,
      ),
      ...change.routes,
    ],
  };
}
