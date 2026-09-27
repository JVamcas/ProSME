"use client";

import {
  GeneralButton,
} from "@/components/ui/button";
import type { WorkflowTaskAction } from "../TaskTypes";

export function WorkflowTaskActions({
  actions,
  disabled,
  onSelect,
  buttonType = "submit",
}: {
  actions: WorkflowTaskAction[];
  disabled: boolean;
  buttonType?: "button" | "submit";
  onSelect: (actionKey: string) => void;
}) {
  return (
    <section
      aria-labelledby="workflow-task-actions-heading"
      className="rounded-t-2xl border border-brand-navy/10 bg-white p-1"
    >
      {actions.length ? (
        <div className="mt-4 flex flex-wrap gap-3">
          {actions.map((action) => (
            <GeneralButton
              disabled={disabled || !action.available}
              key={action.key}
              name="workflowAction"
              onClick={() => onSelect(action.key)}
              title={action.unavailableReason ?? undefined}
              type={buttonType}
              value={action.key}
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
