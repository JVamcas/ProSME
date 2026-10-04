"use client";

import type { Ref } from "react";

import {
  DropdownButton,
  type DropdownButtonItem,
} from "@/shared/ui/DropdownButton";
import type { WorkflowTaskAction } from "@/modules/work-queue/TaskTypes";

export function WorkflowTaskActions({
  actions,
  eligibilityActionRef,
  additionalItems = [],
  disabled,
  onSelect,
}: {
  actions: WorkflowTaskAction[];
  eligibilityActionRef?: Ref<HTMLDivElement>;
  additionalItems?: DropdownButtonItem[];
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
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {actions.length || additionalItems.length ? (
          <DropdownButton
            items={[
              ...actions.map((action) => ({
                description: action.unavailableReason ?? undefined,
                destructive: action.presentation.variant === "danger",
                disabled: disabled || !action.available,
                id: action.key,
                label: action.label,
                onAction: () => onSelect(action.key),
              })),
              ...additionalItems.map((item) => ({
                ...item,
                disabled: disabled || item.disabled,
              })),
            ]}
            ariaLabel="Workflow actions"
            label="Actions"
          />
        ) : (
          <p className="text-sm text-brand-navy/65">
            No workflow actions are configured for this task.
          </p>
        )}
        {eligibilityActionRef ? (
          <div className="ml-auto" ref={eligibilityActionRef} />
        ) : null}
      </div>
    </section>
  );
}
