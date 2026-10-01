import type {
  WorkflowStageInput,
  WorkflowTransitionInput,
} from "../../domain/definitions/WorkflowTypes";

export type WorkflowNodePosition = {
  x: number;
  y: number;
};

export type WorkflowDisplayRoute = {
  destinationKey: string;
  isTerminal: boolean;
  key: string;
  sourceStageKey: string;
};

export const workflowGraphMetrics = {
  canvasPadding: 36,
  columnGap: 200,
  nodeHeight: 132,
  nodeWidth: 264,
  rowGap: 52,
} as const;

export function aggregateWorkflowDisplayRoutes(
  transitions: WorkflowTransitionInput[],
): WorkflowDisplayRoute[] {
  const routes = new Map<string, WorkflowDisplayRoute>();

  for (const transition of transitions) {
    const destinations = transition.terminalOutcome
      ? [{ key: transition.terminalOutcome, isTerminal: true }]
      : transition.targetStageKeys.map((targetStageKey) => ({
          key: targetStageKey,
          isTerminal: false,
        }));

    for (const destination of destinations) {
      const key = [
        transition.sourceStageKey,
        destination.isTerminal ? "terminal" : "stage",
        destination.key,
      ].join(":");

      if (!routes.has(key)) {
        routes.set(key, {
          destinationKey: destination.key,
          isTerminal: destination.isTerminal,
          key,
          sourceStageKey: transition.sourceStageKey,
        });
      }
    }
  }

  return [...routes.values()];
}

export function arrangeWorkflowStages(
  stages: WorkflowStageInput[],
  transitions: WorkflowTransitionInput[],
  nodeHeights: Record<string, number> = {},
): Record<string, WorkflowNodePosition> {
  const orderedStages = [...stages].sort(
    (left, right) => left.displayOrder - right.displayOrder,
  );
  const stageByKey = new Map(
    orderedStages.map((stage) => [stage.stableKey, stage]),
  );
  const depthByKey = new Map(
    orderedStages.map((stage) => [stage.stableKey, stage.initial ? 0 : 0]),
  );

  for (let pass = 0; pass < orderedStages.length; pass += 1) {
    let changed = false;

    for (const transition of transitions) {
      const source = stageByKey.get(transition.sourceStageKey);
      if (!source) continue;
      for (const targetStageKey of transition.targetStageKeys) {
        const target = stageByKey.get(targetStageKey);
        if (!target || target.displayOrder <= source.displayOrder) continue;
        const nextDepth = (depthByKey.get(source.stableKey) ?? 0) + 1;
        if (nextDepth > (depthByKey.get(target.stableKey) ?? 0)) {
          depthByKey.set(target.stableKey, nextDepth);
          changed = true;
        }
      }
    }

    if (!changed) break;
  }

  const columns = new Map<number, WorkflowStageInput[]>();
  for (const stage of orderedStages) {
    const depth = depthByKey.get(stage.stableKey) ?? 0;
    columns.set(depth, [...(columns.get(depth) ?? []), stage]);
  }

  const positions: Record<string, WorkflowNodePosition> = {};
  for (const [depth, columnStages] of columns) {
    let nextY = workflowGraphMetrics.canvasPadding;
    for (const stage of columnStages) {
      positions[stage.stableKey] = {
        x:
          workflowGraphMetrics.canvasPadding +
          depth *
            (workflowGraphMetrics.nodeWidth + workflowGraphMetrics.columnGap),
        y: nextY,
      };
      nextY += (nodeHeights[stage.stableKey] ?? workflowGraphMetrics.nodeHeight) +
        workflowGraphMetrics.rowGap;
    }
  }

  return positions;
}
