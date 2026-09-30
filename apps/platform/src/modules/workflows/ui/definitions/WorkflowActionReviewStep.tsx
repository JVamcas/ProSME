"use client";

import type { WorkflowActionDefinition } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
import type {
  WorkflowEditorView,
  WorkflowStageInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import type { WorkflowTransitionDefinition } from "@/modules/workflows/domain/transitions/WorkflowTransitionDefinition";
import { workflowRouteDestination } from "./WorkflowActionEditorRoutes";
import { workflowActionTypeItems } from "./WorkflowActionFormSchema";

type Props = {
  action: WorkflowActionDefinition;
  editor: WorkflowEditorView;
  routes: readonly WorkflowTransitionDefinition[];
  stage: WorkflowStageInput;
  taskStableKeys: readonly string[];
};

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-brand-navy/50">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-brand-navy">{value}</dd>
    </div>
  );
}

export function WorkflowActionReviewStep({
  action,
  editor,
  routes,
  stage,
  taskStableKeys,
}: Props) {
  const taskNames = stage.tasks
    .filter((task) => taskStableKeys.includes(task.stableKey))
    .map((task) => task.name);
  const actionType = workflowActionTypeItems.find(
    (item) => item.value === action.actionType,
  )?.label ?? action.actionType;

  return (
    <section className="space-y-5" aria-label="Review action">
      <dl className="grid gap-4 rounded-xl border border-brand-navy/10 bg-brand-navy/[0.02] p-4 sm:grid-cols-2">
        <SummaryItem label="Button label" value={action.label} />
        <SummaryItem label="Action type" value={actionType} />
        <SummaryItem label="Stable key" value={action.stableKey} />
        <SummaryItem
          label="Status"
          value={action.enabled ? "Enabled" : "Disabled"}
        />
        <div className="sm:col-span-2">
          <SummaryItem
            label="Available on tasks"
            value={taskNames.join(", ") || "No tasks assigned"}
          />
        </div>
      </dl>
      <div>
        <h3 className="text-sm font-bold text-brand-navy">
          Routing ({routes.length})
        </h3>
        {routes.length ? (
          <ol className="mt-3 space-y-2">
            {[...routes]
              .sort((left, right) => left.priority - right.priority)
              .map((route, index) => (
                <li
                  className="rounded-xl border border-brand-navy/10 px-4 py-3 text-sm"
                  key={route.id ?? `${route.priority}-${index}`}
                >
                  <p className="font-semibold text-brand-navy">
                    Priority {route.priority}: {workflowRouteDestination(route, editor.graph)}
                  </p>
                  <p className="mt-1 text-brand-navy/60">
                    {route.condition ? "Conditional route" : "Default route"}
                  </p>
                </li>
              ))}
          </ol>
        ) : (
          <p className="mt-2 rounded-xl border border-dashed border-brand-navy/20 px-4 py-5 text-sm text-brand-navy/60">
            This action does not change the workflow stage.
          </p>
        )}
      </div>
    </section>
  );
}
