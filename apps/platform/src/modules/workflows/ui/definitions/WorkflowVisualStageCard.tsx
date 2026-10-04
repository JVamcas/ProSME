import {
  ArrowRight,
  CheckCircle2,
  CircleDot,
  GitBranch,
  GripVertical,
} from "lucide-react";
import type { PointerEventHandler, ReactNode } from "react";

import { DeleteButton, EditButton } from "@/components/ui/action-buttons";
import { Badge } from "@/shared/ui/Badge";

import type {
  WorkflowStageInput,
  WorkflowTransitionInput,
} from "../../domain/definitions/WorkflowTypes";
import {
  workflowGraphMetrics,
  type WorkflowNodePosition,
} from "./WorkflowGraphLayout";
import { WorkflowStageConnectionBadge } from "./WorkflowStageConnectionBadge";
import {
  workflowStageConnectionColors,
  type WorkflowStageConnectionRole,
} from "./WorkflowStageConnectionColors";
import {
  workflowVisualChangeStyles,
  type WorkflowVisualRouteStatusResolver,
} from "./WorkflowVisualChangeStyles";

import type { WorkflowVisualRouteTakenResolver } from "./WorkflowVisualGraph";
import type { WorkflowStageAttention } from "./WorkflowStageAttention";

type Props = {
  borderClassName?: string;
  routeTaken?: WorkflowVisualRouteTakenResolver;
  annotation?: ReactNode;
  attention?: WorkflowStageAttention;
  onEdit?: (stage: WorkflowStageInput) => void;
  onDelete?: (stage: WorkflowStageInput) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  isDeleting?: boolean;
  height: number;
  index: number;
  outgoingBranchCount: number;
  onSelect: (key: string) => void;
  onPointerCancel: PointerEventHandler<HTMLButtonElement>;
  onPointerDown: PointerEventHandler<HTMLButtonElement>;
  onPointerMove: PointerEventHandler<HTMLButtonElement>;
  onPointerUp: PointerEventHandler<HTMLButtonElement>;
  position: WorkflowNodePosition;
  selected: boolean;
  stage: WorkflowStageInput;
  stageByKey: Map<string, WorkflowStageInput>;
  transitions: WorkflowTransitionInput[];
  connectionRole?: WorkflowStageConnectionRole;
  routeStatus?: WorkflowVisualRouteStatusResolver;
};

export function WorkflowVisualStageCard({
  annotation,
  borderClassName,
  routeTaken,
  attention,
  onEdit,
  onDelete,
  canEdit = false,
  canDelete = false,
  isDeleting = false,
  height,
  index,
  outgoingBranchCount,
  onSelect,
  position,
  selected,
  stage,
  stageByKey,
  transitions,
  connectionRole,
  routeStatus,
  ...pointerHandlers
}: Props) {
  const routes = transitions
    .filter((route) => route.sourceStageKey === stage.stableKey)
    .sort((left, right) => left.priority - right.priority);

  return (
    <div
      data-workflow-stage={stage.stableKey}
      className={`absolute flex flex-col overflow-hidden rounded-xl border text-left shadow-md transition-[border-color,box-shadow,transform] active:cursor-grabbing ${
        attention
          ? `border-red-500 ${selected ? "ring-2 ring-red-600" : "hover:ring-2 hover:ring-red-300"}`
          : borderClassName
            ? `${borderClassName} ${selected ? "ring-2 ring-brand-navy/25" : "hover:shadow-lg"}`
            : selected
              ? "border-brand-navy ring-2 ring-brand-blue/50"
              : "border-brand-navy/15 hover:-translate-y-0.5 hover:border-brand-blue hover:shadow-lg"
      } ${stage.enabled ? "" : "opacity-55"} ${
        attention
          ? "bg-red-50"
          : connectionRole
            ? workflowStageConnectionColors[connectionRole].row
            : "bg-white"
      }`}
      style={{
        height,
        left: position.x,
        top: position.y,
        width: workflowGraphMetrics.nodeWidth,
      }}
    >
      <button
        {...pointerHandlers}
        aria-pressed={selected}
        className="flex min-h-0 w-full flex-1 cursor-grab touch-none flex-col overflow-hidden text-left active:cursor-grabbing"
        onClick={() => onSelect(stage.stableKey)}
        title={attention?.messages.join("\n")}
        type="button"
      >
        <span className="flex w-full items-start gap-3 border-b border-brand-navy/10 px-4 py-3">
          <span
            className={`grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold text-white ${attention ? "bg-red-600" : "bg-brand-navy"}`}
          >
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
            {attention ? (
              <span className="mt-1 block text-[10px] font-semibold text-red-700">
                {attention.label}
              </span>
            ) : null}
            {connectionRole ? (
              <WorkflowStageConnectionBadge role={connectionRole} />
            ) : null}
          </span>
          <GripVertical className="mt-1 size-4 shrink-0 text-brand-navy/25" />
        </span>
        {annotation ? (
          <span className="flex h-7 w-full shrink-0 items-center px-4">
            {annotation}
          </span>
        ) : null}
        <span className="flex w-full items-center gap-3 px-4 py-2 text-[11px] font-semibold text-brand-navy/55">
          <span>{stage.tasks.length} tasks</span>
          <span>{stage.actions.length} actions</span>
          <span
            aria-label={`${outgoingBranchCount} outgoing branches`}
            className="ml-auto inline-flex items-center gap-1 text-brand-orange"
            title="Outgoing connections to other stages; terminal outcomes are excluded"
          >
            <GitBranch aria-hidden="true" className="size-3" />
            {outgoingBranchCount}
          </span>
        </span>
        <WorkflowVisualStageRoutes
          routes={routes}
          stage={stage}
          stageByKey={stageByKey}
          routeStatus={routeStatus}
          routeTaken={routeTaken}
        />
      </button>
      {onEdit || onDelete ? (
        <div className="flex h-10 shrink-0 items-center justify-end gap-1 border-t border-brand-navy/10 px-2">
          {onEdit ? (
            <EditButton
              disabled={!canEdit}
              onClick={() => onEdit(stage)}
              title={`Edit ${stage.name}`}
            />
          ) : null}
          {onDelete ? (
            <DeleteButton
              disabled={!canDelete}
              isLoading={isDeleting}
              onClick={() => onDelete(stage)}
              title={`Delete ${stage.name}`}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function WorkflowVisualStageRoutes({
  routes,
  stage,
  stageByKey,
  routeStatus,
  routeTaken,
}: {
  routeTaken?: WorkflowVisualRouteTakenResolver;
  routes: WorkflowTransitionInput[];
  stage: WorkflowStageInput;
  stageByKey: Map<string, WorkflowStageInput>;
  routeStatus?: WorkflowVisualRouteStatusResolver;
}) {
  return routes.length ? (
    <span className="block w-full border-t border-brand-navy/10 bg-brand-cream/30 px-3 py-1">
      {routes.map((route, routeIndex) => {
        const action = stage.actions.find(
          (candidate) => candidate.stableKey === route.actionKey,
        );
        const actionLabel = action?.label ?? humanizeCode(route.actionKey);
        const status = routeStatus?.(route);
        const taken = routeTaken?.(route);
        const destination = route.targetStageKeys.length
          ? route.targetStageKeys
              .map((key) => stageByKey.get(key)?.name ?? key)
              .join(", ")
          : humanizeCode(route.terminalOutcome ?? "Terminal outcome");

        return (
          <span
            data-route-taken={taken || undefined}
            className={`flex items-center gap-2 border-b border-brand-navy/5 last:border-b-0 ${status ? "h-[68px]" : "h-[52px]"} ${
              taken
                ? "-mx-1 rounded-md border-l-2 border-l-brand-green bg-brand-green/5 px-1"
                : route.terminalOutcome
                  ? "-mx-1 rounded-md border-l-2 border-l-violet-500 bg-violet-50 px-1"
                  : ""
            }`}
            key={
              route.id ?? `${route.actionKey}-${route.priority}-${routeIndex}`
            }
            title={`${actionLabel} → ${destination}${route.condition ? " (Conditional)" : ""}${route.terminalOutcome ? " · Ends the application's active workflow" : ""}`}
          >
            {route.terminalOutcome ? (
              <CheckCircle2
                aria-label="Terminal outcome"
                className="size-3.5 shrink-0 text-violet-700"
              />
            ) : (
              <ArrowRight
                aria-hidden="true"
                className={`size-3.5 shrink-0 ${taken ? "text-brand-green" : routeTaken ? "text-slate-400" : "text-brand-orange"}`}
              />
            )}
            <span className="min-w-0 flex-1 text-[11px] leading-4">
              <span className="block truncate font-semibold text-brand-navy">
                {actionLabel}
              </span>
              <span className="flex items-center gap-1 text-brand-navy/60">
                <ArrowRight aria-hidden="true" className="size-3 shrink-0" />
                <span className="truncate">{destination}</span>
              </span>
              {route.terminalOutcome ? (
                <Badge
                  className="mt-0.5 border-violet-200 bg-violet-100 py-0 text-[9px] leading-3 text-violet-900"
                  size="sm"
                  variant="outline"
                >
                  Ends application
                </Badge>
              ) : null}
              {status ? (
                <span
                  className={`mt-0.5 inline-flex rounded border px-1 text-[9px] leading-3 ${workflowVisualChangeStyles[status].badge}`}
                >
                  {workflowVisualChangeStyles[status].label}
                </span>
              ) : null}
            </span>
            {route.condition ? (
              <span className="text-[9px] font-semibold text-brand-blue">
                Conditional
              </span>
            ) : null}
          </span>
        );
      })}
    </span>
  ) : null;
}

function humanizeCode(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (character) => character.toUpperCase());
}
