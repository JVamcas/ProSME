"use client";

import {
  ArrowRight,
  CheckCircle2,
  CircleDot,
  GitBranch,
  GripVertical,
} from "lucide-react";
import {
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import type {
  WorkflowStageInput,
  WorkflowTransitionInput,
} from "../../domain/definitions/WorkflowTypes";
import {
  arrangeWorkflowStages,
  workflowGraphMetrics,
  type WorkflowNodePosition,
} from "./WorkflowGraphLayout";

type Props = {
  onSelect: (code: string) => void;
  selectedCode?: string;
  stages: WorkflowStageInput[];
  transitions: WorkflowTransitionInput[];
};

type DragState = {
  code: string;
  origin: WorkflowNodePosition;
  pointerX: number;
  pointerY: number;
};

const { canvasPadding, nodeHeight, nodeWidth } = workflowGraphMetrics;

export function WorkflowVisualGraph({
  onSelect,
  selectedCode,
  stages,
  transitions,
}: Props) {
  const arrangedPositions = useMemo(
    () => arrangeWorkflowStages(stages, transitions),
    [stages, transitions],
  );
  const [positions, setPositions] = useState(arrangedPositions);
  const dragState = useRef<DragState | null>(null);

  const stageByKey = useMemo(
    () => new Map(stages.map((stage) => [stage.stableKey, stage])),
    [stages],
  );
  const terminalOutcomes = useMemo(
    () =>
      [...new Set(
        transitions
          .map((transition) => transition.terminalOutcome)
          .filter((outcome): outcome is string => Boolean(outcome)),
      )].sort(),
    [transitions],
  );
  const graphBounds = workflowGraphBounds(positions, terminalOutcomes.length);
  const terminalPositions = terminalOutcomePositions(
    terminalOutcomes,
    graphBounds.stageRight,
  );

  function startDragging(
    event: ReactPointerEvent<HTMLButtonElement>,
    code: string,
  ) {
    const origin = positions[code];
    if (!origin) return;

    dragState.current = {
      code,
      origin,
      pointerX: event.clientX,
      pointerY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function dragStage(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragState.current;
    if (!drag) return;

    setPositions((current) => ({
      ...current,
      [drag.code]: {
        x: Math.max(canvasPadding, drag.origin.x + event.clientX - drag.pointerX),
        y: Math.max(canvasPadding, drag.origin.y + event.clientY - drag.pointerY),
      },
    }));
  }

  function stopDragging(event: ReactPointerEvent<HTMLButtonElement>) {
    if (dragState.current) {
      event.currentTarget.releasePointerCapture(event.pointerId);
      dragState.current = null;
    }
  }

  return (
    <div className="border-t border-brand-navy/10 bg-brand-cream/35">
      <div className="overflow-auto p-3 sm:p-5">
        <div
          className="relative overflow-hidden rounded-xl border border-brand-navy/10 bg-white/70 shadow-inner"
          style={{ height: graphBounds.height, minWidth: graphBounds.width }}
        >
          <GraphPattern />
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 size-full overflow-visible"
          >
            <defs>
              <marker
                id="workflow-arrow"
                markerHeight="8"
                markerWidth="8"
                orient="auto"
                refX="7"
                refY="4"
              >
                <path d="M0,0 L8,4 L0,8 Z" fill="var(--color-brand-orange)" />
              </marker>
            </defs>
            {transitions.map((transition, index) => {
              const source = positions[transition.sourceStageKey];
              const isTerminalRoute = !transition.targetStageKey;
              const target = transition.targetStageKey
                ? positions[transition.targetStageKey]
                : transition.terminalOutcome
                  ? terminalPositions[transition.terminalOutcome]
                  : undefined;
              if (!source || !target) return null;

              return (
                <path
                  className="fill-none stroke-brand-orange/75"
                  d={workflowRoutePath(
                    source,
                    target,
                    index,
                    isTerminalRoute,
                  )}
                  key={transition.id ?? `${transition.sourceStageKey}-${transition.actionKey}-${transition.priority}`}
                  markerEnd="url(#workflow-arrow)"
                  strokeWidth="2"
                />
              );
            })}
          </svg>

          {stages.map((stage, index) => {
            const position = positions[stage.stableKey];
            if (!position) return null;
            const routeCount = transitions.filter(
              (transition) => transition.sourceStageKey === stage.stableKey,
            ).length;

            return (
              <button
                aria-pressed={stage.stableKey === selectedCode}
                className={`absolute flex cursor-grab touch-none flex-col overflow-hidden rounded-xl border bg-white text-left shadow-md transition-[border-color,box-shadow,transform] active:cursor-grabbing ${
                  stage.stableKey === selectedCode
                    ? "border-brand-navy ring-2 ring-brand-blue/50"
                    : "border-brand-navy/15 hover:-translate-y-0.5 hover:border-brand-blue hover:shadow-lg"
                } ${stage.enabled ? "" : "opacity-55"}`}
                key={stage.stableKey}
                onClick={() => onSelect(stage.stableKey)}
                onPointerCancel={stopDragging}
                onPointerDown={(event) => startDragging(event, stage.stableKey)}
                onPointerMove={dragStage}
                onPointerUp={stopDragging}
                style={{
                  height: nodeHeight,
                  left: position.x,
                  top: position.y,
                  width: nodeWidth,
                }}
                type="button"
              >
                <span className="flex w-full items-start gap-3 border-b border-brand-navy/10 px-4 py-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-navy text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-navy/50">
                      {stage.initial ? (
                        <CircleDot className="size-3 text-brand-orange" />
                      ) : null}
                      Stage {index + 1}
                      {stage.initial ? " · Start" : ""}
                    </span>
                    <span className="mt-1 block line-clamp-2 text-sm font-bold leading-5 text-brand-navy">
                      {stage.name}
                    </span>
                  </span>
                  <GripVertical className="mt-1 size-4 shrink-0 text-brand-navy/25" />
                </span>
                <span className="flex w-full items-center gap-3 px-4 py-2 text-[11px] font-semibold text-brand-navy/55">
                  <span>{stage.tasks.length} tasks</span>
                  <span>{stage.actions.length} actions</span>
                  <span className="ml-auto inline-flex items-center gap-1 text-brand-orange">
                    <GitBranch className="size-3" />
                    {routeCount}
                  </span>
                </span>
              </button>
            );
          })}

          {terminalOutcomes.map((outcome) => {
            const position = terminalPositions[outcome];
            return (
              <div
                className="absolute flex h-12 w-52 items-center gap-2 rounded-xl border border-brand-orange/35 bg-brand-cream px-3 text-xs font-bold text-brand-navy shadow-sm"
                key={outcome}
                style={{ left: position.x, top: position.y - 24 }}
              >
                <CheckCircle2 className="size-4 shrink-0 text-brand-orange" />
                <span className="truncate">{humanizeCode(outcome)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <SelectedStageRoutes
        stage={selectedCode ? stageByKey.get(selectedCode) : undefined}
        stageByKey={stageByKey}
        transitions={transitions}
      />
    </div>
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

function SelectedStageRoutes({
  stage,
  stageByKey,
  transitions,
}: {
  stage?: WorkflowStageInput;
  stageByKey: Map<string, WorkflowStageInput>;
  transitions: WorkflowTransitionInput[];
}) {
  if (!stage) return null;
  const routes = transitions
    .filter((transition) => transition.sourceStageKey === stage.stableKey)
    .sort((left, right) => left.priority - right.priority);

  return (
    <div className="border-t border-brand-navy/10 bg-white px-5 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-navy/45">
          Routes from {stage.name}
        </span>
        {routes.length ? (
          routes.map((route) => {
            const action = stage.actions.find(
              (candidate) => candidate.stableKey === route.actionKey,
            );
            const destination = route.targetStageKey
              ? stageByKey.get(route.targetStageKey)?.name ?? route.targetStageKey
              : humanizeCode(route.terminalOutcome ?? "Terminal outcome");

            return (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-brand-navy/10 bg-brand-cream/60 px-3 py-1.5 text-xs font-semibold text-brand-navy"
                key={route.id ?? `${route.actionKey}-${route.priority}`}
              >
                {action?.label ?? humanizeCode(route.actionKey)}
                <ArrowRight className="size-3 text-brand-orange" />
                {destination}
                {route.condition ? (
                  <span className="text-[10px] font-bold uppercase text-brand-blue">
                    Conditional
                  </span>
                ) : null}
              </span>
            );
          })
        ) : (
          <span className="text-xs text-brand-navy/50">No routes configured</span>
        )}
      </div>
    </div>
  );
}

function workflowGraphBounds(
  positions: Record<string, WorkflowNodePosition>,
  terminalCount: number,
) {
  const values = Object.values(positions);
  const stageRight = Math.max(
    canvasPadding + nodeWidth,
    ...values.map((position) => position.x + nodeWidth),
  );
  const stageBottom = Math.max(
    canvasPadding + nodeHeight,
    ...values.map((position) => position.y + nodeHeight),
  );

  return {
    height: Math.max(300, stageBottom + canvasPadding, terminalCount * 64 + 56),
    stageRight,
    width: stageRight + (terminalCount ? 300 : canvasPadding),
  };
}

function terminalOutcomePositions(outcomes: string[], stageRight: number) {
  return Object.fromEntries(
    outcomes.map((outcome, index) => [
      outcome,
      {
        x: stageRight + 64,
        y: 52 + index * 64,
      },
    ]),
  );
}

function workflowRoutePath(
  source: WorkflowNodePosition,
  target: WorkflowNodePosition,
  routeIndex: number,
  isTerminalRoute: boolean,
) {
  const startX = source.x + nodeWidth;
  const startY = source.y + nodeHeight / 2 + ((routeIndex % 3) - 1) * 9;
  const endX = target.x;
  const endY = target.y + (isTerminalRoute ? 0 : nodeHeight / 2);

  if (endX > startX) {
    const control = Math.max(44, (endX - startX) / 2);
    return `M ${startX} ${startY} C ${startX + control} ${startY}, ${endX - control} ${endY}, ${endX - 9} ${endY}`;
  }

  const loopY = Math.max(startY, endY) + nodeHeight / 2 + 44 + routeIndex * 3;
  return `M ${startX} ${startY} C ${startX + 56} ${startY}, ${startX + 56} ${loopY}, ${startX} ${loopY} L ${endX - 48} ${loopY} C ${endX - 20} ${loopY}, ${endX - 20} ${endY}, ${endX - 9} ${endY}`;
}

function humanizeCode(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (character) => character.toUpperCase());
}
