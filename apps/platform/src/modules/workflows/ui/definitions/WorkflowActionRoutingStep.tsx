"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { DeleteButton, EditButton } from "@/components/ui/action-buttons";
import { GeneralButton } from "@/components/ui/button";
import type { WorkflowActionType } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
import type {
  WorkflowEditorView,
  WorkflowStageInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import type { WorkflowTransitionDefinition } from "@/modules/workflows/domain/transitions/WorkflowTransitionDefinition";
import { workflowRouteDestination } from "./WorkflowActionEditorRoutes";
import { WorkflowRejectionOutcomeFields } from "./WorkflowRejectionOutcomeFields";
import { WorkflowActionRouteEditor } from "./WorkflowActionRouteEditor";

type Props = {
  actionKey: string;
  actionType: WorkflowActionType;
  editor: WorkflowEditorView;
  onChange: (routes: WorkflowTransitionDefinition[]) => void;
  onRejectionOutcomeChange: (value: "TERMINAL" | "TRANSITION") => void;
  rejectionOutcomeType: "TERMINAL" | "TRANSITION";
  routes: WorkflowTransitionDefinition[];
  stage: WorkflowStageInput;
};

type EditingRoute = "new" | number | null;

function routeTargetType(route: WorkflowTransitionDefinition) {
  return route.terminalOutcome ? "TERMINAL" as const : "STAGE" as const;
}

export function WorkflowActionRoutingStep({
  actionKey,
  actionType,
  editor,
  onChange,
  onRejectionOutcomeChange,
  rejectionOutcomeType,
  routes,
  stage,
}: Props) {
  const [editing, setEditing] = useState<EditingRoute>(null);
  const orderedRoutes = routes
    .map((route, index) => ({ index, route }))
    .sort((left, right) => left.route.priority - right.route.priority);
  const editingIndex = typeof editing === "number" ? editing : undefined;
  const nextPriority = Math.max(0, ...routes.map((route) => route.priority)) + 1;
  const otherRoutes = routes.filter((_, index) => index !== editingIndex);
  const rejectionConstraint = actionType === "REJECT" && otherRoutes.length
    ? routeTargetType(otherRoutes[0])
    : undefined;

  function saveRoute(route: WorkflowTransitionDefinition) {
    const nextRoutes = editingIndex === undefined
      ? [...routes, route]
      : routes.map((current, index) => index === editingIndex ? route : current);
    onChange(nextRoutes);
    if (actionType === "REJECT") {
      onRejectionOutcomeChange(
        route.terminalOutcome ? "TERMINAL" : "TRANSITION",
      );
    }
    setEditing(null);
  }

  return (
    <section className="space-y-4" aria-label="Action routing">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-brand-navy">Routes</h3>
          <p className="mt-1 text-sm text-brand-navy/60">
            Define where the workflow goes when this action is selected.
          </p>
        </div>
        {editing === null ? (
          <GeneralButton
            onClick={() => setEditing("new")}
            size="compact"
            type="button"
          >
            <Plus className="size-4" /> Add route
          </GeneralButton>
        ) : null}
      </div>
      {orderedRoutes.length ? (
        <ol className="space-y-2">
          {orderedRoutes.map(({ index, route }) => (
            <li
              className="flex items-start justify-between gap-3 rounded-xl border border-brand-navy/10 px-4 py-3"
              key={route.id ?? `${route.priority}-${index}`}
            >
              <div className="min-w-0 text-sm">
                <p className="font-semibold text-brand-navy">
                  Priority {route.priority}: {workflowRouteDestination(route, editor.graph)}
                </p>
                <p className="mt-1 text-brand-navy/60">
                  {route.condition ? "Conditional route" : "Default route"}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <EditButton
                  disabled={editing !== null}
                  onClick={() => setEditing(index)}
                  title="Edit route"
                />
                <DeleteButton
                  disabled={editing !== null}
                  onClick={() => onChange(routes.filter((_, itemIndex) => itemIndex !== index))}
                  title="Delete route"
                />
              </div>
            </li>
          ))}
        </ol>
      ) : editing === null ? (
        <p className="rounded-xl border border-dashed border-brand-navy/20 px-4 py-6 text-center text-sm text-brand-navy/60">
          No routes configured. This action will not change the workflow stage.
        </p>
      ) : null}
      {editing !== null ? (
        <WorkflowActionRouteEditor
          actionKey={actionKey}
          editor={editor}
          onCancel={() => setEditing(null)}
          onSave={saveRoute}
          priority={editingIndex === undefined ? nextPriority : routes[editingIndex].priority}
          priorityInUse={(priority) =>
            routes.some(
              (route, index) => index !== editingIndex && route.priority === priority,
            )
          }
          route={editingIndex === undefined ? undefined : routes[editingIndex]}
          stage={stage}
          targetTypeConstraint={rejectionConstraint}
        />
      ) : null}
      {actionType === "REJECT" && editing === null ? (
        rejectionOutcomeType === "TERMINAL" ? (
          <WorkflowRejectionOutcomeFields />
        ) : (
          <p className="text-sm text-brand-navy/70">
            Rejection follows the configured stage routes. Terminal rejection
            settings do not apply.
          </p>
        )
      ) : null}
    </section>
  );
}
