// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { clientWorkflowService } from "@/modules/workflows/ClientWorkflowService";
import type { WorkflowEditorView } from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { WorkflowStageFlow } from "@/modules/workflows/ui/definitions/WorkflowStageFlow";
import { referenceWorkflow } from "../../../support/ReferenceWorkflowFixture";

(globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT: boolean;
}).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => vi.restoreAllMocks());

async function mount(canEdit = true) {
  const graph = structuredClone(referenceWorkflow);
  graph.transitions = graph.transitions.slice(0, 2);
  graph.transitions[0].targetStageKeys.push(graph.stages[2].stableKey);
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
  const update = vi.spyOn(clientWorkflowService, "updateDraft").mockResolvedValue(editor);
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
    container.querySelector<HTMLButtonElement>("button[aria-expanded]")!.click();
  });
  return {
    editor,
    update,
    container,
    cleanup: async () => {
      await act(async () => root.unmount());
      container.remove();
      client.clear();
    },
  };
}

async function clickDialogButton(label: string) {
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>(
    '[role="dialog"] button',
  )).find((item) => item.textContent === label);
  expect(button).toBeDefined();
  await act(async () => button!.click());
}

describe("workflow path label actions", () => {
  it("opens the existing route editor and saves only the clicked route", async () => {
    const view = await mount();
    try {
      const edit = view.container.querySelector<HTMLButtonElement>(
        '[aria-label^="Edit path:"]',
      )!;
      expect(edit.closest("svg")?.getAttribute("aria-hidden")).not.toBe("true");
      expect(edit.parentElement?.className).toContain("group-hover:opacity-100");
      expect(edit.parentElement?.className).toContain("group-focus-within:opacity-100");
      await act(async () => edit.click());
      expect(document.querySelector('[role="dialog"]')?.textContent)
        .toContain("Edit workflow path");
      expect(document.querySelector<HTMLInputElement>('input[name="priority"]')?.value)
        .toBe(String(view.editor.graph.transitions[0].priority));
      await act(async () => {
        const priority = document.querySelector<HTMLInputElement>('input[name="priority"]')!;
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
        setter.call(priority, "2");
        priority.dispatchEvent(new Event("input", { bubbles: true }));
        priority.dispatchEvent(new Event("change", { bubbles: true }));
      });
      await clickDialogButton("Save route");
      expect(view.update).toHaveBeenCalledExactlyOnceWith("definition", {
        expectedRowVersion: 3,
        versionId: "version",
        graph: {
          stages: view.editor.graph.stages,
          transitions: [
            { ...view.editor.graph.transitions[0], priority: 2, terminalOutcome: null },
            view.editor.graph.transitions[1],
          ],
        },
      });
      expect(document.querySelector('[role="dialog"]')).toBeNull();
    } finally {
      await view.cleanup();
    }
  }, 15_000);

  it("confirms the complete parallel path and preserves actions and other routes", async () => {
    const view = await mount();
    try {
      await act(async () => {
        view.container.querySelector<HTMLButtonElement>('[aria-label^="Delete path:"]')!
          .click();
      });
      const dialog = document.querySelector('[role="dialog"]')!;
      for (const key of view.editor.graph.transitions[0].targetStageKeys) {
        expect(dialog.textContent).toContain(
          view.editor.graph.stages.find((stage) => stage.stableKey === key)!.name,
        );
      }
      expect(view.update).not.toHaveBeenCalled();
      await clickDialogButton("Delete path");
      expect(view.update).toHaveBeenCalledExactlyOnceWith("definition", {
        expectedRowVersion: 3,
        versionId: "version",
        graph: {
          stages: view.editor.graph.stages,
          transitions: view.editor.graph.transitions.slice(1),
        },
      });
    } finally {
      await view.cleanup();
    }
  }, 15_000);

  it("keeps failed deletions open and displays the server error", async () => {
    const view = await mount();
    view.update.mockRejectedValue(new Error("The workflow has changed. Refresh and retry."));
    try {
      await act(async () => {
        view.container.querySelector<HTMLButtonElement>('[aria-label^="Delete path:"]')!
          .click();
      });
      await clickDialogButton("Delete path");
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });
      expect(document.querySelector('[role="dialog"] [role="alert"]')?.textContent)
        .toContain("The workflow has changed.");
    } finally {
      await view.cleanup();
    }
  }, 15_000);

  it("disables path actions when the editor is locked", async () => {
    const view = await mount(false);
    try {
      const buttons = view.container.querySelectorAll<HTMLButtonElement>(
        '[aria-label^="Edit path:"], [aria-label^="Delete path:"]',
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
