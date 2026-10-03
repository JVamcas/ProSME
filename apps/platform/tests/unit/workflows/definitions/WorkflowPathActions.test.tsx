// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { clientWorkflowService } from "@/modules/workflows/ClientWorkflowService";
import { workflowQueryKeys } from "@/modules/workflows/WorkflowHooks";
import type { WorkflowEditorView } from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { WorkflowStageFlow } from "@/modules/workflows/ui/definitions/WorkflowStageFlow";
import { referenceWorkflow } from "../../../support/ReferenceWorkflowFixture";

(
  globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT: boolean;
  }
).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => vi.restoreAllMocks());

async function mount(canEdit = true) {
  const graph = structuredClone(referenceWorkflow);
  graph.transitions = graph.transitions.slice(1, 3);
  graph.transitions[0].targetStageKeys.push(graph.stages[3].stableKey);
  graph.transitions.push({
    ...graph.transitions[0],
    targetStageKeys: [graph.stages[4].stableKey],
    priority: 2,
  });
  const editor: WorkflowEditorView = {
    allowedActions: [],
    definition: {
      id: "definition",
      code: "REFERENCE",
      name: "Reference",
      description: "",
    },
    graph,
    validation: { valid: true, errors: [], warnings: [] },
    version: {
      id: "version",
      number: 1,
      status: "DRAFT",
      rowVersion: 3,
      createdAt: "2026-09-14T00:00:00.000Z",
      publishedAt: null,
      retiredAt: null,
    },
  };
  const update = vi
    .spyOn(clientWorkflowService, "updateDraft")
    .mockResolvedValue(editor);
  const deletion = vi
    .spyOn(clientWorkflowService, "deleteAction")
    .mockResolvedValue(editor);
  const client = new QueryClient();
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <WorkflowStageFlow canEdit={canEdit} editor={editor} />
      </QueryClientProvider>,
    );
  });
  await act(async () => {
    container
      .querySelector<HTMLButtonElement>("button[aria-expanded]")!
      .click();
  });
  return {
    editor,
    client,
    update,
    deletion,
    container,
    cleanup: async () => {
      await act(async () => root.unmount());
      container.remove();
      client.clear();
    },
  };
}

async function clickDialogButton(label: string) {
  const button = Array.from(
    document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button'),
  ).find((item) => item.textContent === label);
  expect(button).toBeDefined();
  await act(async () => button!.click());
}

describe("workflow path label actions", () => {
  it("opens the existing action form for the path's source stage", async () => {
    const view = await mount();
    try {
      const edit = view.container.querySelector<HTMLButtonElement>(
        '[aria-label^="Edit action:"]',
      )!;
      expect(edit.closest("svg")?.getAttribute("aria-hidden")).not.toBe("true");
      const label = edit.parentElement?.parentElement;
      expect(label?.textContent).toContain(
        view.editor.graph.stages[1].actions[0].label,
      );
      expect(label?.className).toContain("inline-flex");
      expect(edit.parentElement?.className).not.toContain("absolute");
      await act(async () => edit.click());
      expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
        "Edit task action",
      );
      expect(
        document.querySelector<HTMLInputElement>('input[name="label"]')?.value,
      ).toBe(view.editor.graph.stages[1].actions[0].label);
      expect(document.querySelector('input[name="stableKey"]')).toBeNull();
      expect(view.update).not.toHaveBeenCalled();
      await act(async () => {
        const input = document.querySelector<HTMLInputElement>(
          'input[name="label"]',
        )!;
        const setter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )!.set!;
        setter.call(input, "Updated path action");
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      });
      await clickDialogButton("Continue");
      await clickDialogButton("Continue");
      await clickDialogButton("Continue");
      expect(
        document.querySelector('[aria-label="Review action"]'),
      ).not.toBeNull();
      expect(view.update).not.toHaveBeenCalled();
      await clickDialogButton("Save action");
      expect(view.update).toHaveBeenCalledTimes(1);
      const savedGraph = view.update.mock.calls[0][1].graph;
      expect(savedGraph.stages[1].actions[0].label).toBe("Updated path action");
      expect(savedGraph.stages[1].actions[0].stableKey).toBe(
        view.editor.graph.stages[1].actions[0].stableKey,
      );
      expect(savedGraph.stages[0]).toEqual(view.editor.graph.stages[0]);
      expect(savedGraph.transitions).toHaveLength(
        view.editor.graph.transitions.length,
      );
      expect(savedGraph.transitions).toEqual(
        expect.arrayContaining(view.editor.graph.transitions),
      );
      expect(document.querySelector('[role="dialog"]')).toBeNull();
    } finally {
      await view.cleanup();
    }
  }, 15_000);

  it("confirms action deletion and removes all its routes and task bindings", async () => {
    const view = await mount();
    const transition = view.editor.graph.transitions[0];
    const stage = view.editor.graph.stages.find(
      (item) => item.stableKey === transition.sourceStageKey,
    )!;
    const action = stage.actions.find(
      (item) => item.stableKey === transition.actionKey,
    )!;
    try {
      await act(async () => {
        view.container
          .querySelector<HTMLButtonElement>('[aria-label^="Delete action:"]')!
          .click();
      });
      const dialog = document.querySelector('[role="dialog"]')!;
      expect(dialog.textContent).toContain("Delete workflow action");
      expect(dialog.textContent).toContain(action.label);
      expect(dialog.textContent).toContain("transitions and Task bindings");
      expect(view.update).not.toHaveBeenCalled();
      await clickDialogButton("Delete action");
      expect(view.deletion).toHaveBeenCalledExactlyOnceWith("definition", {
        expectedRowVersion: 3,
        versionId: "version",
        stageKey: stage.stableKey,
        actionKey: action.stableKey,
      });
      expect(
        view.client.getQueryData(workflowQueryKeys.detail("definition")),
      ).toEqual(view.editor);
      expect(
        view.client.getQueryData(
          workflowQueryKeys.detail("definition", "version"),
        ),
      ).toEqual(view.editor);
      expect(view.update).not.toHaveBeenCalled();
      expect(document.querySelector('[role="dialog"]')).toBeNull();
    } finally {
      await view.cleanup();
    }
  }, 15_000);

  it("cancels action deletion without saving", async () => {
    const view = await mount();
    try {
      await act(async () => {
        view.container
          .querySelector<HTMLButtonElement>('[aria-label^="Delete action:"]')!
          .click();
      });
      await clickDialogButton("Cancel");
      expect(view.deletion).not.toHaveBeenCalled();
      expect(document.querySelector('[role="dialog"]')).toBeNull();
      expect(view.update).not.toHaveBeenCalled();
    } finally {
      await view.cleanup();
    }
  }, 15_000);

  it("keeps failed deletions open and displays the server error", async () => {
    const view = await mount();
    view.deletion.mockRejectedValue(
      new Error("The workflow has changed. Refresh and retry."),
    );
    try {
      await act(async () => {
        view.container
          .querySelector<HTMLButtonElement>('[aria-label^="Delete action:"]')!
          .click();
      });
      await clickDialogButton("Delete action");
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
      expect(
        document.querySelector('[role="dialog"] [role="alert"]')?.textContent,
      ).toContain("The workflow has changed.");
    } finally {
      await view.cleanup();
    }
  }, 15_000);

  it("disables path actions when the editor is locked", async () => {
    const view = await mount(false);
    try {
      const buttons = view.container.querySelectorAll<HTMLButtonElement>(
        '[aria-label^="Edit action:"], [aria-label^="Delete action:"]',
      );
      expect(buttons.length).toBeGreaterThan(0);
      await act(async () => {
        buttons.forEach((button) => {
          expect(button.disabled).toBe(true);
          button.click();
        });
      });
      expect(document.querySelector('[role="dialog"]')).toBeNull();
      expect(view.update).not.toHaveBeenCalled();
    } finally {
      await view.cleanup();
    }
  }, 15_000);
});
