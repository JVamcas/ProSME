import type { WorkflowVisualRouteTakenResolver } from "./WorkflowVisualGraph";
import { DeleteButton, EditButton } from "@/components/ui/action-buttons";

import type {
  WorkflowStageInput,
  WorkflowTransitionInput,
} from "../../domain/definitions/WorkflowTypes";
import {
  workflowGraphMetrics,
  type WorkflowDisplayRoute,
  type WorkflowNodePosition,
} from "./WorkflowGraphLayout";
import {
  workflowVisualChangeStyles,
  type WorkflowVisualRouteStatusResolver,
} from "./WorkflowVisualChangeStyles";

export function WorkflowVisualRoute({
  onToggleRoute,
  onEditRoute,
  onDeleteRoute,
  disabled,
  destinationName,
  geometry,
  route,
  stage,
  transitions,
  markerId = "workflow-arrow",
  routeStatus,
  routeTaken,
}: {
  onToggleRoute?: (transition: WorkflowTransitionInput) => void;
  onEditRoute?: (transition: WorkflowTransitionInput) => void;
  onDeleteRoute?: (transition: WorkflowTransitionInput) => void;
  disabled?: boolean;
  destinationName?: string;
  geometry: ReturnType<typeof workflowRouteGeometry>;
  route: WorkflowDisplayRoute;
  stage?: WorkflowStageInput;
  transitions: WorkflowTransitionInput[];
  markerId?: string;
  routeStatus?: WorkflowVisualRouteStatusResolver;
  routeTaken?: WorkflowVisualRouteTakenResolver;
}) {
  const matchingTransitions = transitions
    .filter(
      (transition) =>
        transition.sourceStageKey === route.sourceStageKey &&
        transition.targetStageKeys.includes(route.destinationKey),
    )
    .sort((left, right) => left.priority - right.priority);
  const actionLabels = matchingTransitions.map((transition) => {
    const action = stage?.actions.find(
      (candidate) => candidate.stableKey === transition.actionKey,
    );
    const label =
      action?.label ??
      transition.actionKey
        .toLowerCase()
        .replaceAll("_", " ")
        .replace(/^./, (character) => character.toUpperCase());
    const status = routeStatus?.(transition, route.destinationKey);
    return {
      label: `${label}${transition.condition ? " (Conditional)" : ""}`,
      status,
      transition,
      hasAction: Boolean(action),
      taken: routeTaken?.(transition, route.destinationKey) ?? false,
    };
  });
  const hasLabelActions = Boolean(
    onToggleRoute || onEditRoute || onDeleteRoute,
  );
  const labels = hasLabelActions
    ? actionLabels
    : [
        ...new Map(
          actionLabels.map((entry) => [
            `${entry.label}:${entry.status}:${entry.taken}`,
            entry,
          ]),
        ).values(),
      ];
  const firstStatus = labels[0]?.status;
  const taken = actionLabels.some((entry) => entry.taken);
  const color = taken
    ? "var(--color-brand-green)"
    : routeTaken
      ? "#94a3b8"
      : firstStatus
        ? workflowVisualChangeStyles[firstStatus].color
        : undefined;
  const dashed = labels.every((entry) => entry.status === "suggested");

  const selectable = Boolean(onToggleRoute && firstStatus !== "deleted");

  return (
    <g data-workflow-route={route.key} data-route-taken={taken || undefined}>
      {selectable && !disabled ? (
        <path
          aria-hidden="true"
          className="pointer-events-auto cursor-pointer fill-none"
          d={geometry.path}
          onClick={() => onToggleRoute?.(matchingTransitions[0])}
          stroke="transparent"
          strokeWidth="16"
          style={{ pointerEvents: "stroke" }}
        />
      ) : null}
      <path
        aria-hidden="true"
        className={color ? "fill-none" : "fill-none stroke-brand-orange/75"}
        d={geometry.path}
        markerEnd={`url(#${markerId})`}
        stroke={color}
        strokeDasharray={dashed ? "6 5" : undefined}
        strokeWidth={taken ? 3 : 2}
      />
      <foreignObject
        height="1"
        style={{ overflow: "visible" }}
        width={geometry.labelWidth}
        x={geometry.labelX - geometry.labelWidth / 2}
        y={geometry.labelY}
      >
        <div className="flex -translate-y-1/2 flex-col items-center gap-1">
          {labels.map(
            ({ label, status, transition, hasAction, taken }, index) => {
              const className = `max-w-full rounded-md border px-2 py-1 text-center text-[10px] font-semibold leading-4 shadow-sm [overflow-wrap:anywhere] ${
                taken
                  ? "border-brand-green bg-white text-brand-green"
                  : routeTaken
                    ? "border-slate-300 bg-white text-slate-500"
                    : status
                      ? workflowVisualChangeStyles[status].badge
                      : "border-brand-orange/25 bg-white text-brand-navy"
              }`;
              const content = (
                <>
                  {label}
                  {status ? (
                    <span className="block text-[9px]">
                      {workflowVisualChangeStyles[status].label}
                    </span>
                  ) : null}
                </>
              );
              if (selectable) {
                return (
                  <button
                    aria-label={`Replacement route: ${stage?.name ?? route.sourceStageKey} [${label}] to ${destinationName ?? route.destinationKey}`}
                    aria-pressed={status === "created"}
                    className={`${className} pointer-events-auto cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-default disabled:opacity-60`}
                    disabled={disabled}
                    key={transition.id ?? index}
                    onClick={() => onToggleRoute?.(transition)}
                    type="button"
                  >
                    {content}
                  </button>
                );
              }
              return (
                <span
                  className={`${className} inline-flex items-center gap-1 pointer-events-auto`}
                  key={transition.id ?? index}
                >
                  <span className="min-w-0">{content}</span>
                  {onEditRoute || onDeleteRoute ? (
                    <span className="flex shrink-0 items-center">
                      {onEditRoute ? (
                        <EditButton
                          className="size-6 rounded p-0 [&_svg]:size-3.5"
                          disabled={disabled || !hasAction}
                          onClick={() => onEditRoute(transition)}
                          title={`Edit action: ${label} from ${stage?.name ?? route.sourceStageKey} to ${destinationName ?? route.destinationKey}`}
                        />
                      ) : null}
                      {onDeleteRoute ? (
                        <DeleteButton
                          className="size-6 rounded p-0 [&_svg]:size-3.5"
                          disabled={disabled || !hasAction}
                          onClick={() => onDeleteRoute(transition)}
                          title={`Delete action: ${label} from ${stage?.name ?? route.sourceStageKey} to ${destinationName ?? route.destinationKey}`}
                        />
                      ) : null}
                    </span>
                  ) : null}
                </span>
              );
            },
          )}
        </div>
      </foreignObject>
    </g>
  );
}

export function workflowRouteGeometry(
  source: WorkflowNodePosition,
  target: WorkflowNodePosition,
  routeIndex: number,
  sourceHeight: number = workflowGraphMetrics.nodeHeight,
  targetHeight: number = workflowGraphMetrics.nodeHeight,
  detourY?: number,
) {
  const startX = source.x + workflowGraphMetrics.nodeWidth;
  const startY = source.y + sourceHeight / 2 + ((routeIndex % 3) - 1) * 9;
  const endX = target.x;
  const endY = target.y + targetHeight / 2;

  const arrowX = endX - 9;

  if (arrowX > startX && detourY === undefined) {
    const bendX = (startX + arrowX) / 2;
    return {
      path: roundedWorkflowPath([
        { x: startX, y: startY },
        { x: bendX, y: startY },
        { x: bendX, y: endY },
        { x: arrowX, y: endY },
      ]),
      labelX: bendX,
      labelY: (startY + endY) / 2,
      labelWidth: Math.max(64, Math.min(180, endX - startX - 20)),
      bottom: Math.max(startY, endY),
      right: endX,
    };
  }

  const loopY = Math.max(
    detourY ?? 0,
    Math.max(startY, endY) +
      Math.max(sourceHeight, targetHeight) / 2 +
      44 +
      routeIndex * 3,
  );
  return {
    path: roundedWorkflowPath([
      { x: startX, y: startY },
      { x: startX + 56, y: startY },
      { x: startX + 56, y: loopY },
      { x: endX - 48, y: loopY },
      { x: endX - 48, y: endY },
      { x: arrowX, y: endY },
    ]),
    labelX: (startX + 56 + endX - 48) / 2,
    labelY: loopY,
    labelWidth: 180,
    bottom: loopY + 36,
    right: startX + 56,
  };
}

function roundedWorkflowPath(points: WorkflowNodePosition[]) {
  const vertices = points.filter((point, index) => {
    const previous = points[index - 1];
    return !previous || point.x !== previous.x || point.y !== previous.y;
  });
  const start = vertices[0];
  const commands = [`M ${start.x} ${start.y}`];

  for (let index = 1; index < vertices.length - 1; index += 1) {
    const previous = vertices[index - 1];
    const corner = vertices[index];
    const next = vertices[index + 1];
    const incomingLength = Math.hypot(corner.x - previous.x, corner.y - previous.y);
    const outgoingLength = Math.hypot(next.x - corner.x, next.y - corner.y);
    const radius = Math.min(10, incomingLength / 2, outgoingLength / 2);
    const entryX = corner.x + Math.sign(previous.x - corner.x) * radius;
    const entryY = corner.y + Math.sign(previous.y - corner.y) * radius;
    const exitX = corner.x + Math.sign(next.x - corner.x) * radius;
    const exitY = corner.y + Math.sign(next.y - corner.y) * radius;

    commands.push(`L ${entryX} ${entryY}`);
    commands.push(`Q ${corner.x} ${corner.y} ${exitX} ${exitY}`);
  }

  const end = vertices[vertices.length - 1];
  commands.push(`L ${end.x} ${end.y}`);
  return commands.join(" ");
}
