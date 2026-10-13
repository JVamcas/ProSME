// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

import type { ActionMenuItem } from "@/shared/ui/ActionMenu";
import { WorkflowStageTaskTable } from "@/modules/workflows/ui/definitions/WorkflowStageTaskTable";
import { referenceWorkflow } from "../../support/ReferenceWorkflowFixture";

vi.mock("@/shared/ui/ActionMenu", () => ({
  ActionMenu: ({ label, items }: { label: string; items: ActionMenuItem[] }) => (
    <div aria-label={label}>
      {items.map((item) => (
        <button
          data-destructive={item.destructive}
          disabled={item.disabled}
          key={item.id}
          onClick={item.onAction}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  ),
}));

(globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT: boolean;
}).IS_REACT_ACT_ENVIRONMENT = true;

describe("workflow stage task menu", () => {
  it.each([true, false])(
    "preserves task callbacks and edit availability when canEdit=%s",
    async (canEdit) => {
      const stage = structuredClone(referenceWorkflow.stages[0]);
      const task = stage.tasks[0];
      const onPreview = vi.fn();
      const onEdit = vi.fn();
      const onDelete = vi.fn();
      const container = document.createElement("div");
      const root = createRoot(container);

      try {
        await act(async () => {
          root.render(
            <WorkflowStageTaskTable
              canEdit={canEdit}
              onAdd={vi.fn()}
              onDelete={onDelete}
              onEdit={onEdit}
              onPreview={onPreview}
              stage={stage}
            />,
          );
        });

        const menu = container.querySelector("tbody [aria-label]");
        expect(menu?.getAttribute("aria-label")).toBe(`Actions for ${task.name}`);
        const buttons = Array.from(menu!.querySelectorAll("button"));
        expect(buttons.map((button) => button.textContent)).toEqual([
          "Preview",
          "Edit",
          "Delete",
        ]);
        expect(buttons.map((button) => button.disabled)).toEqual([
          false,
          !canEdit,
          !canEdit,
        ]);
        expect(buttons[2].dataset.destructive).toBe("true");

        await act(async () => {
          buttons.forEach((button) => button.click());
        });
        expect(onPreview).toHaveBeenCalledWith(task);
        if (canEdit) {
          expect(onEdit).toHaveBeenCalledWith(task);
          expect(onDelete).toHaveBeenCalledWith(task);
        } else {
          expect(onEdit).not.toHaveBeenCalled();
          expect(onDelete).not.toHaveBeenCalled();
        }
      } finally {
        await act(async () => root.unmount());
      }
    },
  );
});
