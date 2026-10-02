"use client";

import { useMemo, useId, type ReactNode } from "react";

import type {
  WorkflowStageInput,
  WorkflowTransitionInput,
} from "../../domain/definitions/WorkflowTypes";
import {
  aggregateWorkflowDisplayRoutes,
  arrangeWorkflowStages,
  workflowGraphMetrics,
  type WorkflowDisplayRoute,
  type WorkflowNodePosition,
} from "./WorkflowGraphLayout";
import { WorkflowVisualStageCard } from "./WorkflowVisualStageCard";
import {
  WorkflowVisualRoute,
  workflowRouteGeometry,
} from "./WorkflowVisualRoute";
import type { WorkflowStageConnectionRole } from "./WorkflowStageConnectionColors";
import type { WorkflowVisualRouteStatusResolver } from "./WorkflowVisualChangeStyles";
import { useWorkflowGraphDrag } from "./useWorkflowGraphDrag";

import type { WorkflowStageAttention } from "./WorkflowStageAttention";

export type WorkflowVisualRouteTakenResolver = (
  transition: WorkflowTransitionInput,
  destinationKey?: string,
) => boolean;

type Props = {
  stageBorderClasses?: Map<string, string>;
  routeTaken?: WorkflowVisualRouteTakenResolver;
  stageAnnotations?: Map<string, ReactNode>;
  attentionByStage?: Map<string, WorkflowStageAttention>;
  onEdit?: (stage: WorkflowStageInput) => void;
  onDelete?: (stage: WorkflowStageInput) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  isDeleting?: boolean;
  onSelect: (code: string) => void;
  onToggleRoute?: (transition: WorkflowTransitionInput) => void;
  onEditRoute?: (transition: WorkflowTransitionInput) => void;
  onDeleteRoute?: (transition: WorkflowTransitionInput) => void;
  routesDisabled?: boolean;
  selectedCode?: string;
  stages: WorkflowStageInput[];
  transitions: WorkflowTransitionInput[];
  connectionRoles?: Map<string, WorkflowStageConnectionRole>;
  routeStatus?: WorkflowVisualRouteStatusResolver;
  changeColor?: string;
  viewportClassName?: string;
  viewportLabel?: string;
};

const { canvasPadding, nodeHeight, nodeWidth } = workflowGraphMetrics;

export function WorkflowVisualGraph({
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
  onToggleRoute,
  onEditRoute,
  onDeleteRoute,
  routesDisabled,
  selectedCode,
  stages,
  transitions,
  connectionRoles,
  routeStatus,
  changeColor,
  viewportClassName,
  viewportLabel,
}: Props) {
  const instanceId = useId();
  const markerId =
    changeColor || routeTaken
      ? `workflow-arrow-${instanceId}`
      : "workflow-arrow";
  const nodeHeights = useMemo(
    () =>
      workflowStageCardHeights(
        stages,
        transitions,
        connectionRoles,
        Boolean(routeStatus),
        Boolean(onEdit || onDelete),
        attentionByStage,
      ),
    [
      stages,
      transitions,
      connectionRoles,
      routeStatus,
      onEdit,
      onDelete,
      attentionByStage,
    ],
  );
  const annotatedNodeHeights = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(nodeHeights).map(([key, height]) => [
          key,
          height + (stageAnnotations?.has(key) ? 28 : 0),
        ]),
      ),
    [nodeHeights, stageAnnotations],
  );
  const arrangedPositions = useMemo(
    () => arrangeWorkflowStages(stages, transitions, annotatedNodeHeights),
    [stages, transitions, annotatedNodeHeights],
  );
  const { positions, startDragging, dragStage, stopDragging } =
    useWorkflowGraphDrag(arrangedPositions);

  const stageByKey = useMemo(
    () => new Map(stages.map((stage) => [stage.stableKey, stage])),
    [stages],
  );
  const displayRoutes = useMemo(() => {
    const groups = new Map<string, WorkflowTransitionInput[]>();
    for (const transition of transitions) {
      const status = routeStatus?.(transition) ?? "default";
      const groupKey =
        onToggleRoute && status !== "deleted"
          ? `${status}:${transition.id}`
          : status;
      groups.set(groupKey, [...(groups.get(groupKey) ?? []), transition]);
    }
    return [...groups].flatMap(([status, group]) =>
      aggregateWorkflowDisplayRoutes(group)
        .filter((route) => !route.isTerminal)
        .map((route) => ({
          ...route,
          key: status === "default" ? route.key : `${status}:${route.key}`,
          transitions: group,
        })),
    );
  }, [transitions, routeStatus, onToggleRoute]);
  const routeGeometries = workflowRouteGeometries(
    displayRoutes,
    positions,
    annotatedNodeHeights,
    routeStatus,
  );
  const graphBounds = workflowGraphBounds(positions, annotatedNodeHeights);
  const outgoingBranchCounts = new Map<string, number>();
  for (const { route } of routeGeometries) {
    outgoingBranchCounts.set(
      route.sourceStageKey,
      (outgoingBranchCounts.get(route.sourceStageKey) ?? 0) + 1,
    );
  }
  for (const { geometry } of routeGeometries) {
    graphBounds.height = Math.max(
      graphBounds.height,
      geometry.bottom + canvasPadding,
    );
    graphBounds.width = Math.max(
      graphBounds.width,
      geometry.right + canvasPadding,
    );
  }

  return (
    <div className="min-w-0 max-w-full border-t border-brand-navy/10 bg-brand-cream/35">
      <p className="px-3 pt-3 text-xs text-brand-navy/70 sm:px-5">
        <span className="font-semibold text-violet-900">Violet highlights</span>
        {" mark terminal actions that end the application's active workflow."}
      </p>
      <div
        aria-label={viewportLabel}
        className={`min-w-0 max-w-full overflow-auto overscroll-contain p-3 sm:p-5 ${viewportClassName ?? ""}`}
        role={viewportLabel ? "region" : undefined}
        tabIndex={viewportLabel ? 0 : undefined}
      >
        <div
          className="relative overflow-hidden rounded-xl border border-brand-navy/10 bg-white/70 shadow-inner"
          style={{ height: graphBounds.height, width: graphBounds.width }}
        >
          <GraphPattern />
          <svg
            aria-hidden={
              onToggleRoute || onEditRoute || onDeleteRoute ? undefined : true
            }
            className="pointer-events-none absolute inset-0 size-full overflow-visible"
          >
            <GraphArrowMarker markerId={markerId} />
            {routeGeometries.map(({ route, geometry }) => (
              <WorkflowVisualRoute
                onToggleRoute={onToggleRoute}
                onEditRoute={onEditRoute}
                onDeleteRoute={onDeleteRoute}
                disabled={routesDisabled}
                destinationName={stageByKey.get(route.destinationKey)?.name}
                geometry={geometry}
                markerId={markerId}
                key={route.key}
                route={route}
                stage={stageByKey.get(route.sourceStageKey)}
                transitions={route.transitions}
                routeStatus={routeStatus}
                routeTaken={routeTaken}
              />
            ))}
          </svg>

          {stages.map((stage, index) => {
            const position = positions[stage.stableKey];
            if (!position) return null;
            return (
              <WorkflowVisualStageCard
                routeTaken={routeTaken}
                borderClassName={stageBorderClasses?.get(stage.stableKey)}
                annotation={stageAnnotations?.get(stage.stableKey)}
                attention={attentionByStage?.get(stage.stableKey)}
                outgoingBranchCount={
                  outgoingBranchCounts.get(stage.stableKey) ?? 0
                }
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
        </div>
      </div>
    </div>
  );
}

function GraphArrowMarker({ markerId }: { markerId: string }) {
  return (
    <defs>
      <marker
        id={markerId}
        markerHeight="8"
        markerWidth="8"
        orient="auto"
        refX="7"
        refY="4"
      >
        <path d="M0,0 L8,4 L0,8 Z" fill="context-stroke" />
      </marker>
    </defs>
  );
}

function GraphPattern() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 opacity-40"
      style={{
        backgroundImage:
          "radial-gradient(color-mix(in srgb, var(--color-brand-navy) 20%, transparent) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }}
    />
  );
}

function workflowGraphBounds(
  positions: Record<string, WorkflowNodePosition>,
  nodeHeights: Record<string, number>,
) {
  const values = Object.values(positions);
  const stageRight = Math.max(
    canvasPadding + nodeWidth,
    ...values.map((position) => position.x + nodeWidth),
  );
  const stageBottom = Math.max(
    canvasPadding + nodeHeight,
    ...Object.entries(positions).map(
      ([key, position]) => position.y + (nodeHeights[key] ?? nodeHeight),
    ),
  );

  return {
    height: Math.max(300, stageBottom + canvasPadding),
    width: stageRight + canvasPadding,
  };
}

function workflowStageCardHeights(
  stages: WorkflowStageInput[],
  transitions: WorkflowTransitionInput[],
  connectionRoles?: Map<string, WorkflowStageConnectionRole>,
  hasRouteStatus = false,
  hasActions = false,
  attentionByStage?: Map<string, WorkflowStageAttention>,
) {
  const routeCounts = new Map<string, number>();
  for (const route of transitions) {
    routeCounts.set(
      route.sourceStageKey,
      (routeCounts.get(route.sourceStageKey) ?? 0) + 1,
    );
  }
  return Object.fromEntries(
    stages.map((stage) => [
      stage.stableKey,
      nodeHeight +
        (hasActions ? 40 : 0) +
        (attentionByStage?.has(stage.stableKey) ? 24 : 0) +
        (connectionRoles?.has(stage.stableKey) ? 24 : 0) +
        (routeCounts.get(stage.stableKey) ?? 0) * (hasRouteStatus ? 68 : 52),
    ]),
  );
}

function workflowRouteGeometries(
  displayRoutes: (WorkflowDisplayRoute & {
    transitions: WorkflowTransitionInput[];
  })[],
  positions: Record<string, WorkflowNodePosition>,
  nodeHeights: Record<string, number>,
  routeStatus?: WorkflowVisualRouteStatusResolver,
) {
  return displayRoutes.flatMap((route, index) => {
    const source = positions[route.sourceStageKey];
    const destination = positions[route.destinationKey];
    if (!source || !destination) return [];
    const sharedRoutes = displayRoutes.filter(
      (candidate) =>
        candidate.sourceStageKey === route.sourceStageKey &&
        candidate.destinationKey === route.destinationKey,
    );
    const lane = sharedRoutes.findIndex(
      (candidate) => candidate.key === route.key,
    );
    const offset = (lane - (sharedRoutes.length - 1) / 2) * 60;
    const status = routeStatus?.(route.transitions[0]);
    const bypassedNodes =
      status && status !== "deleted"
        ? Object.entries(positions).filter(
            ([, position]) =>
              position.x > source.x && position.x < destination.x,
          )
        : [];
    const detourY = bypassedNodes.length
      ? Math.max(
          ...bypassedNodes.map(
            ([key, position]) => position.y + nodeHeights[key],
          ),
        ) +
        44 +
        index * 16
      : undefined;

    return [
      {
        route,
        geometry: workflowRouteGeometry(
          { ...source, y: source.y + offset },
          { ...destination, y: destination.y + offset },
          index,
          nodeHeights[route.sourceStageKey],
          nodeHeights[route.destinationKey],
          detourY,
        ),
      },
    ];
  });
}
