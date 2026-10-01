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
  disabled,
  destinationName,
  geometry,
  route,
  stage,
  transitions,
  markerId = "workflow-arrow",
  routeStatus,
}: {
  onToggleRoute?: (transition: WorkflowTransitionInput) => void;
  disabled?: boolean;
  destinationName?: string;
  geometry: ReturnType<typeof workflowRouteGeometry>;
  route: WorkflowDisplayRoute;
  stage?: WorkflowStageInput;
  transitions: WorkflowTransitionInput[];
  markerId?: string;
  routeStatus?: WorkflowVisualRouteStatusResolver;
}) {
  const matchingTransitions = transitions
    .filter((transition) => (
      transition.sourceStageKey === route.sourceStageKey &&
      transition.targetStageKeys.includes(route.destinationKey)
    ))
    .sort((left, right) => left.priority - right.priority);
  const actionLabels = matchingTransitions.map((transition) => {
    const action = stage?.actions.find(
      (candidate) => candidate.stableKey === transition.actionKey,
    );
    const label = action?.label ?? transition.actionKey
      .toLowerCase()
      .replaceAll("_", " ")
      .replace(/^./, (character) => character.toUpperCase());
    const status = routeStatus?.(transition, route.destinationKey);
    return {
      label: `${label}${transition.condition ? " (Conditional)" : ""}`,
      status,
      transition,
    };
  });
  const labels = onToggleRoute ? actionLabels : [...new Map(
    actionLabels.map((entry) => [`${entry.label}:${entry.status}`, entry]),
  ).values()];
  const firstStatus = labels[0]?.status;
  const color = firstStatus ? workflowVisualChangeStyles[firstStatus].color : undefined;
  const dashed = labels.every((entry) => entry.status === "suggested");

  const selectable = Boolean(onToggleRoute && firstStatus !== "deleted");

  return (
    <g data-workflow-route={route.key}>
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
        strokeWidth="2"
      />
      <foreignObject
        height="1"
        style={{ overflow: "visible" }}
        width={geometry.labelWidth}
        x={geometry.labelX - geometry.labelWidth / 2}
        y={geometry.labelY}
      >
        <div className="flex -translate-y-1/2 flex-col items-center gap-1">
          {labels.map(({ label, status, transition }, index) => {
            const className = `max-w-full rounded-md border px-2 py-1 text-center text-[10px] font-semibold leading-4 shadow-sm [overflow-wrap:anywhere] ${
              status
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
              <span className={className} key={`${label}:${status}`}>
                {content}
              </span>
            );
          })}
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

  if (endX > startX && detourY === undefined) {
    const control = Math.max(44, (endX - startX) / 2);
    return {
      path: `M ${startX} ${startY} C ${startX + control} ${startY}, ${endX - control} ${endY}, ${endX - 9} ${endY}`,
      labelX: (startX + endX) / 2 - 1.125,
      labelY: (startY + endY) / 2,
      labelWidth: Math.max(64, Math.min(180, endX - startX - 20)),
      bottom: Math.max(startY, endY),
      right: endX,
    };
  }

  const loopY = Math.max(
    detourY ?? 0,
    Math.max(startY, endY) +
      Math.max(sourceHeight, targetHeight) / 2 + 44 + routeIndex * 3,
  );
  return {
    path: `M ${startX} ${startY} C ${startX + 56} ${startY}, ${startX + 56} ${loopY}, ${startX} ${loopY} L ${endX - 48} ${loopY} C ${endX - 20} ${loopY}, ${endX - 20} ${endY}, ${endX - 9} ${endY}`,
    labelX: (startX + endX - 48) / 2,
    labelY: loopY,
    labelWidth: 180,
    bottom: loopY + 36,
    right: startX + 56,
  };
}
