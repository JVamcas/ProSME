"use client";

import { DropdownButton } from "@/shared/ui/DropdownButton";
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
      className="rounded-t-2xl border border-brand-navy/10 bg-white p-1"
    >
      <h2 className="sr-only" id="workflow-task-actions-heading">
        Workflow actions
      </h2>
      {actions.length ? (
        <div className="mt-4">
          <DropdownButton
            items={actions.map((action) => ({
              description: action.unavailableReason ?? undefined,
              destructive: action.presentation.variant === "danger",
              disabled: disabled || !action.available,
              id: action.key,
              label: action.label,
              onAction: () => onSelect(action.key),
            }))}
            ariaLabel="Workflow actions"
            label="Actions"
          />
        </div>
      ) : (
        <p className="mt-2 text-sm text-brand-navy/65">
          No workflow actions are configured for this task.
        </p>
      )}
    </section>
  );
}
