"use client";

import {
  GeneralButton,
  type ButtonProps,
} from "@/components/ui/button";
import type { WorkflowActionType } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
import type { WorkflowTaskAction } from "../TaskTypes";

export const workflowActionButtonVariants = {
  APPROVE_ADVANCE: "success",
  DEFER: "subtle",
  ESCALATE: "primary",
  PUT_ON_HOLD: "yellow",
  REFER: "navy",
  REJECT: "danger",
  REQUEST_INFORMATION: "outlineOrange",
  RETURN: "outlineOrange",
  WITHDRAW: "danger",
} satisfies Record<WorkflowActionType, ButtonProps["variant"]>;

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
              disabled={disabled}
              key={action.key}
              onClick={() => onSelect(action.key)}
              type="submit"
              variant={workflowActionButtonVariants[action.actionType]}
            >
              {action.label}
            </GeneralButton>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-brand-navy/65">
          No workflow action is available for this task.
        </p>
      )}
    </section>
  );
}
