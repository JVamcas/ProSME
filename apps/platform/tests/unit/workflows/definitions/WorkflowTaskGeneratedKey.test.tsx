// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { FormProvider } from "react-hook-form";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/forms/FormHooks", () => ({
  usePublishedForms: () => ({ data: [], isPending: false }),
}));
const { mutateAsync } = vi.hoisted(() => ({ mutateAsync: vi.fn() }));
vi.mock("@/modules/workflows/WorkflowHooks", () => ({
  useSaveWorkflowGraph: () => ({ mutateAsync }),
}));

import type { WorkflowEditorView } from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { referenceWorkflow } from "../../../support/ReferenceWorkflowFixture";
import { useWorkflowTaskDialogController } from "@/modules/workflows/ui/definitions/WorkflowTaskDialogController";
import { WorkflowTaskDetailsStep } from "@/modules/workflows/ui/definitions/WorkflowTaskDetailsStep";

(globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT: boolean;
}).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  vi.clearAllMocks();
  document.body.replaceChildren();
});

async function mountTask(editing: boolean, existingOrder = 1) {
  const graph = structuredClone(referenceWorkflow);
  const stage = graph.stages[0];
  const task = stage.tasks[0];
  task.displayOrder = existingOrder;
  task.name = "Finance review";
  task.stableKey = "FINANCE_REVIEW";
  const editor = {
    definition: { id: "template" },
    version: { id: "draft", status: "DRAFT", rowVersion: 1 },
    graph,
  } as WorkflowEditorView;
  let controller!: ReturnType<typeof useWorkflowTaskDialogController>;
  function Harness() {
    controller = useWorkflowTaskDialogController(
      editor,
      stage,
      editing ? task : undefined,
    );
    return (
      <FormProvider {...controller.form}>
        <WorkflowTaskDetailsStep />
      </FormProvider>
    );
  }
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(<Harness />));
  return { controller, container, root };
}

describe("generated workflow task keys", () => {
  it("removes the stable-key field and creates a collision-safe key", async () => {
    const view = await mountTask(false);
    try {
      expect(view.container.querySelector('[name="stableKey"]')).toBeNull();
      expect(view.container.textContent).not.toContain("Stable key");
      await act(async () => {
        view.controller.form.setValue("name", "Finance review");
        expect(await view.controller.validateStep("details")).toBe(true);
        await view.controller.save(view.controller.form.getValues());
      });
      expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({
        stages: expect.arrayContaining([expect.objectContaining({
          tasks: expect.arrayContaining([expect.objectContaining({
            name: "Finance review",
            stableKey: "FINANCE_REVIEW_2",
          })]),
        })]),
      }));
    } finally {
      await act(async () => view.root.unmount());
    }
  });

  it("chooses a free order when existing tasks have gaps", async () => {
    const view = await mountTask(false, 2);
    try {
      expect(view.controller.form.getValues("displayOrder")).toBe(3);
    } finally {
      await act(async () => view.root.unmount());
    }
  });

  it("blocks a duplicate order in both step validation and save", async () => {
    const view = await mountTask(false, 2);
    try {
      await act(async () => {
        view.controller.form.setValue("name", "Another review");
        view.controller.form.setValue("displayOrder", 2);
        expect(await view.controller.validateStep("details")).toBe(false);
        expect(await view.controller.save(view.controller.form.getValues()))
          .toBe(false);
      });
      expect(view.controller.form.getFieldState("displayOrder").error?.message)
        .toContain("not used by another task");
      expect(mutateAsync).not.toHaveBeenCalled();
    } finally {
      await act(async () => view.root.unmount());
    }
  });

  it("preserves the original key when an existing task is renamed", async () => {
    const view = await mountTask(true);
    try {
      await act(async () => {
        await view.controller.save({
          ...view.controller.form.getValues(),
          name: "Updated review name",
        });
      });
      expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({
        stages: expect.arrayContaining([expect.objectContaining({
          tasks: expect.arrayContaining([expect.objectContaining({
            name: "Updated review name",
            stableKey: "FINANCE_REVIEW",
          })]),
        })]),
      }));
    } finally {
      await act(async () => view.root.unmount());
    }
  });
});
