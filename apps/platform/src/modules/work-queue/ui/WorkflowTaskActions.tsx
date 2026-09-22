"use client";

import {
  GeneralButton,
} from "@/components/ui/button";
import type { WorkflowTaskAction } from "../TaskTypes";

export function WorkflowTaskActions({
  actions,
  disabled,
  onSelect,
}: {
  actions: WorkflowTaskAction[];
  disabled: boolean;
  onSelect: (actionKey: string) => void;
}) {
  return (
    <section
      aria-labelledby="workflow-task-actions-heading"
      className="rounded-2xl border border-brand-navy/10 bg-white p-5"
    >
      <h2
        className="text-sm font-bold uppercase tracking-wider text-brand-navy/55"
        id="workflow-task-actions-heading"
      >
        Workflow actions
      </h2>
      {actions.length ? (
        <div className="mt-4 flex flex-wrap gap-3">
          {actions.map((action) => (
            <GeneralButton
              disabled={disabled || !action.available}
              key={action.key}
              onClick={() => onSelect(action.key)}
              title={action.unavailableReason ?? undefined}
              type="submit"
              variant={action.presentation.variant}
            >
              {action.label}
            </GeneralButton>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-brand-navy/65">
          No workflow actions are configured for this task.
        </p>
      )}
    </section>
  );
}
