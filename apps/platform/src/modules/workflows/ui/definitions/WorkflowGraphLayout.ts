import type {
  WorkflowStageInput,
  WorkflowTransitionInput,
} from "../../domain/definitions/WorkflowTypes";

export type WorkflowNodePosition = {
  x: number;
  y: number;
};

export const workflowGraphMetrics = {
  canvasPadding: 36,
  columnGap: 112,
  nodeHeight: 132,
  nodeWidth: 264,
  rowGap: 52,
} as const;

export function arrangeWorkflowStages(
  stages: WorkflowStageInput[],
  transitions: WorkflowTransitionInput[],
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
      if (!transition.targetStageKey) continue;
      const source = stageByKey.get(transition.sourceStageKey);
      const target = stageByKey.get(transition.targetStageKey);

      if (!source || !target || target.displayOrder <= source.displayOrder) {
        continue;
      }

      const nextDepth = (depthByKey.get(source.stableKey) ?? 0) + 1;
      if (nextDepth > (depthByKey.get(target.stableKey) ?? 0)) {
        depthByKey.set(target.stableKey, nextDepth);
        changed = true;
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
    columnStages.forEach((stage, row) => {
      positions[stage.stableKey] = {
        x:
          workflowGraphMetrics.canvasPadding +
          depth *
            (workflowGraphMetrics.nodeWidth + workflowGraphMetrics.columnGap),
        y:
          workflowGraphMetrics.canvasPadding +
          row * (workflowGraphMetrics.nodeHeight + workflowGraphMetrics.rowGap),
      };
    });
  }

  return positions;
}
