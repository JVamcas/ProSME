// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/modules/forms/FormHooks", () => ({
  usePublishedForms: () => ({ data: [], isPending: false }),
}));
const { mutateAsync } = vi.hoisted(() => ({ mutateAsync: vi.fn() }));
vi.mock("@/modules/workflows/WorkflowHooks", () => ({
  useSaveWorkflowGraph: () => ({ mutateAsync, isPending: false }),
}));

import type { WorkflowEditorView } from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { WorkflowTaskDialog } from "@/modules/workflows/ui/definitions/WorkflowTaskDialog";
import { referenceWorkflow } from "../../../support/ReferenceWorkflowFixture";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

afterEach(() => {
  vi.clearAllMocks();
  document.body.replaceChildren();
});

async function mount() {
  const graph = structuredClone(referenceWorkflow);
  const stage = graph.stages[0];
  const task = stage.tasks[0];
  const roleId = "10000000-0000-4000-8000-000000000001";
  task.roleId = roleId;
  const editor: WorkflowEditorView = {
    allowedActions: [],
    definition: {
      id: "template",
      code: "REFERENCE",
      name: "Reference",
      description: "",
    },
    version: {
      id: "draft",
      number: 1,
      status: "DRAFT",
      rowVersion: 1,
      createdAt: "2026-10-12T00:00:00.000Z",
      publishedAt: null,
      retiredAt: null,
    },
    graph,
    validation: { valid: true, errors: [], warnings: [] },
    assignmentOptions: { roles: [{ id: roleId, label: "Reviewer" }], users: [] },
  };
  const close = vi.fn();
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <WorkflowTaskDialog
        editor={editor}
        isOpen
        onClose={close}
        stage={stage}
        task={task}
      />,
    );
  });
  return {
    close,
    cleanup: async () => {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}

function button(label: string) {
  const found = Array.from(document.querySelectorAll<HTMLButtonElement>(
    '[role="dialog"] button',
  )).find((item) => item.textContent === label);
  expect(found).toBeDefined();
  return found!;
}

async function click(label: string) {
  await act(async () => button(label).click());
}

describe("workflow task save confirmation", () => {
  it("enters the final step without turning Continue into a submit button or saving", async () => {
    const view = await mount();
    try {
      await click("Continue");
      const continueButton = button("Continue");
      expect(continueButton.type).toBe("button");
      await click("Continue");
      const saveButton = button("Save task");
      expect(saveButton).not.toBe(continueButton);
      expect(continueButton.isConnected).toBe(false);
      expect(saveButton.type).toBe("submit");
      expect(document.querySelector('select[name="assignmentTarget"]')).not.toBeNull();
      expect(mutateAsync).not.toHaveBeenCalled();
      expect(view.close).not.toHaveBeenCalled();
      await click("Save task");
      expect(mutateAsync).toHaveBeenCalledTimes(1);
      expect(view.close).toHaveBeenCalledTimes(1);
    } finally {
      await view.cleanup();
    }
  });

  it("opens the last step from its marker and ignores submissions without Save task", async () => {
    const view = await mount();
    try {
      await click("Continue");
      const marker = document.querySelector<HTMLButtonElement>(
        'button[aria-label="Assignment & completion, not complete"]',
      )!;
      await act(async () => marker.click());
      expect(button("Save task")).toBeDefined();
      const form = document.querySelector<HTMLFormElement>('[role="dialog"] form')!;
      await act(async () => {
        form.dispatchEvent(new SubmitEvent("submit", {
          bubbles: true,
          cancelable: true,
        }));
      });
      expect(mutateAsync).not.toHaveBeenCalled();
      expect(view.close).not.toHaveBeenCalled();
      await click("Back");
      await click("Continue");
      expect(mutateAsync).not.toHaveBeenCalled();
      await click("Save task");
      expect(mutateAsync).toHaveBeenCalledTimes(1);
    } finally {
      await view.cleanup();
    }
  });
});
