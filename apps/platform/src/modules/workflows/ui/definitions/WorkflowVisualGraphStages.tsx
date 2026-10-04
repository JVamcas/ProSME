import type { WorkflowStageInput } from "../../domain/definitions/WorkflowTypes";
import type { WorkflowNodePosition } from "./WorkflowGraphLayout";
import type { WorkflowVisualGraphProps } from "./WorkflowVisualGraph";
import type { useWorkflowGraphDrag } from "./useWorkflowGraphDrag";
import { WorkflowVisualStageCard } from "./WorkflowVisualStageCard";

export function WorkflowVisualGraphStages({
  stageProps,
  positions,
  nodeHeights: annotatedNodeHeights,
  stageByKey,
  outgoingBranchCounts,
  drag: { startDragging, dragStage, stopDragging },
}: {
  stageProps: WorkflowVisualGraphProps;
  positions: Record<string, WorkflowNodePosition>;
  nodeHeights: Record<string, number>;
  stageByKey: Map<string, WorkflowStageInput>;
  outgoingBranchCounts: Map<string, number>;
  drag: ReturnType<typeof useWorkflowGraphDrag>;
}) {
  const {
    stages,
    transitions,
    stageAnnotations,
    stageBorderClasses,
    routeTaken,
    attentionByStage,
    onSelect,
    onEdit,
    onDelete,
    canEdit,
    canDelete,
    isDeleting,
    selectedCode,
    connectionRoles,
    routeStatus,
  } = stageProps;
  return (
    <>
      {stages.map((stage, index) => {
        const position = positions[stage.stableKey];
        if (!position) return null;
        return (
          <WorkflowVisualStageCard
            routeTaken={routeTaken}
            borderClassName={stageBorderClasses?.get(stage.stableKey)}
            annotation={stageAnnotations?.get(stage.stableKey)}
            attention={attentionByStage?.get(stage.stableKey)}
            outgoingBranchCount={outgoingBranchCounts.get(stage.stableKey) ?? 0}
            index={connectionRoles ? stage.displayOrder - 1 : index}
            connectionRole={connectionRoles?.get(stage.stableKey)}
            key={stage.stableKey}
            onSelect={onSelect}
            onEdit={onEdit}
            onDelete={onDelete}
            canEdit={canEdit}
            canDelete={canDelete}
            isDeleting={isDeleting}
            onPointerCancel={stopDragging}
            onPointerDown={(event) => startDragging(event, stage.stableKey)}
            onPointerMove={dragStage}
            onPointerUp={stopDragging}
            position={position}
            height={annotatedNodeHeights[stage.stableKey]}
            selected={stage.stableKey === selectedCode}
            stage={stage}
            stageByKey={stageByKey}
            transitions={transitions}
            routeStatus={routeStatus}
          />
        );
      })}
    </>
  );
}
