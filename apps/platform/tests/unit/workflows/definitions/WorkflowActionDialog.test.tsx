// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { clientWorkflowService } from "@/modules/workflows/ClientWorkflowService";
import type { WorkflowEditorView } from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { WorkflowActionDialog } from "@/modules/workflows/ui/definitions/WorkflowActionDialog";
import {
  workflowActionFormDefaults,
  toWorkflowActionDefinition,
} from "@/modules/workflows/ui/definitions/WorkflowActionFormMapping";
import { referenceWorkflow } from "../../../support/ReferenceWorkflowFixture";

(
  globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT: boolean;
  }
).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => vi.restoreAllMocks());

async function mount(rejectionOutcome?: "TERMINAL" | "TRANSITION") {
  const editor: WorkflowEditorView = {
    allowedActions: [],
    definition: {
      id: "definition",
      code: "REFERENCE",
      name: "Reference",
      description: "",
    },
    graph: structuredClone(referenceWorkflow),
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
  const action = rejectionOutcome
    ? toWorkflowActionDefinition({
        ...workflowActionFormDefaults(undefined, 2),
        stableKey: "REJECT",
        label: "Reject",
        actionType: "REJECT",
        rejectionOutcomeType: rejectionOutcome,
      })
    : undefined;
  if (action) {
    editor.graph.stages[0].actions.push(action);
    editor.graph.stages[0].tasks[0].actionKeys.push(action.stableKey);
    editor.graph.transitions.push({
      actionKey: action.stableKey,
      sourceStageKey: editor.graph.stages[0].stableKey,
      targetStageKeys:
        rejectionOutcome === "TRANSITION"
          ? [editor.graph.stages[1].stableKey]
          : [],
      terminalOutcome: rejectionOutcome === "TERMINAL" ? "REJECTED" : null,
      priority: 1,
      condition: null,
    });
  }
  const update = vi
    .spyOn(clientWorkflowService, "updateDraft")
    .mockResolvedValue(editor);
  const close = vi.fn();
  const client = new QueryClient();
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <WorkflowActionDialog
          action={action}
          editor={editor}
          isOpen
          onClose={close}
          stage={editor.graph.stages[0]}
        />
      </QueryClientProvider>,
    );
  });
  return {
    close,
    editor,
    update,
    cleanup: async () => {
      await act(async () => root.unmount());
      container.remove();
      client.clear();
    },
  };
}

async function clickButton(label: string) {
  const button = Array.from(
    document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button'),
  ).find((item) => item.textContent === label);
  expect(button).toBeDefined();
  await act(async () => button!.click());
}

async function changeLabel(label: string) {
  await act(async () => {
    const input = document.querySelector<HTMLInputElement>(
      'input[name="label"]',
    )!;
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!;
    setter.call(input, label);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

describe("workflow action dialog", () => {
  it("generates a unique key and saves only after explicit confirmation", async () => {
    const view = await mount();
    try {
      expect(document.querySelector('input[name="stableKey"]')).toBeNull();
      expect(
        document.querySelector('input[name="reasonRequired"]')?.closest("label")
          ?.textContent,
      ).toContain("Require a reason");
      await changeLabel("Advance");
      await clickButton("Continue");
      await clickButton("Continue");
      await clickButton("Continue");
      expect(
        document.querySelector('[aria-label="Review action"]')?.textContent,
      ).toContain("ADVANCE_2");
      expect(view.update).not.toHaveBeenCalled();
      expect(view.close).not.toHaveBeenCalled();
      await clickButton("Save action");
      expect(view.update).toHaveBeenCalledTimes(1);
      const graph = view.update.mock.calls[0][1].graph;
      expect(graph.stages[0].actions.at(-1)?.stableKey).toBe("ADVANCE_2");
      expect(graph.stages[0].tasks[0].actionKeys).toContain("ADVANCE_2");
      expect(graph.transitions).toEqual(view.editor.graph.transitions);
      expect(view.close).toHaveBeenCalledTimes(1);
    } finally {
      await view.cleanup();
    }
  });

  it("opens Review from the step marker without saving and blocks implicit submission", async () => {
    const view = await mount();
    try {
      await changeLabel("Approve review!");
      await clickButton("Continue");
      await clickButton("Continue");
      const review = document.querySelector<HTMLButtonElement>(
        'button[aria-label="Review, not complete"]',
      )!;
      await act(async () => review.click());
      expect(
        document.querySelector('[aria-label="Review action"]')?.textContent,
      ).toContain("APPROVE_REVIEW");
      const form = document.querySelector('[role="dialog"] form')!;
      await act(async () => {
        form.dispatchEvent(
          new SubmitEvent("submit", {
            bubbles: true,
            cancelable: true,
          }),
        );
      });
      expect(view.update).not.toHaveBeenCalled();
      expect(view.close).not.toHaveBeenCalled();
      await clickButton("Back");
      await clickButton("Back");
      await clickButton("Back");
      await changeLabel("Advance");
      await clickButton("Continue");
      await clickButton("Continue");
      await clickButton("Continue");
      expect(
        document.querySelector('[aria-label="Review action"]')?.textContent,
      ).toContain("ADVANCE_2");
      expect(view.update).not.toHaveBeenCalled();
    } finally {
      await view.cleanup();
    }
  });
  it.each(["TERMINAL", "TRANSITION"] as const)(
    "configures %s rejection consequences in Routing",
    async (outcome) => {
      const view = await mount(outcome);
      try {
        expect(
          document.querySelector('input[name="reasonRequired"]'),
        ).not.toBeNull();
        await clickButton("Continue");
        expect(
          document.querySelector('input[name="cancelOpenTasks"]'),
        ).toBeNull();
        expect(
          document.querySelector('input[name="reasonRequired"]'),
        ).toBeNull();
        await clickButton("Continue");
        expect(
          document.querySelector('[aria-label="Action routing"]'),
        ).not.toBeNull();
        expect(
          document.querySelector('input[name="cancelOpenTasks"]'),
        ).toBeNull();
        expect(
          document.querySelector('input[name="cancelOpenStageInstances"]'),
        ).toBeNull();
        if (outcome === "TERMINAL") {
          await act(async () => {
            const input = document.querySelector<HTMLInputElement>(
              'input[name="rejectionPublicLabel"]',
            )!;
            Object.getOwnPropertyDescriptor(
              HTMLInputElement.prototype,
              "value",
            )!.set!.call(input, "");
            input.dispatchEvent(new Event("input", { bubbles: true }));
          });
          await clickButton("Continue");
          expect(
            document.querySelector('[aria-label="Action routing"]'),
          ).not.toBeNull();
          expect(
            document.querySelector('[role="dialog"]')?.textContent,
          ).toContain("Enter a safe applicant-facing label.");
        } else {
          await clickButton("Continue");
          await clickButton("Save action");
          const saved =
            view.update.mock.calls[0][1].graph.stages[0].actions.find(
              (item) => item.stableKey === "REJECT",
            );
          expect(saved?.configuration).toMatchObject({
            outcome: { type: outcome },
          });
        }
      } finally {
        await view.cleanup();
      }
    },
  );

  it("shows terminal settings immediately after changing a stage route", async () => {
    const view = await mount("TRANSITION");
    try {
      await clickButton("Continue");
      await clickButton("Continue");
      await act(async () => {
        document
          .querySelector<HTMLButtonElement>('button[title="Edit route"]')!
          .click();
      });
      await act(async () => {
        const select = document.querySelector<HTMLSelectElement>(
          'select[name="targetType"]',
        )!;
        select.value = "TERMINAL";
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });
      await act(async () => {
        const select = document.querySelector<HTMLSelectElement>(
          'select[name="terminalOutcome"]',
        )!;
        select.value = "REJECTED";
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });
      await clickButton("Save route");
      expect(
        document.querySelector('[aria-label="Action routing"]')?.textContent,
      ).toContain("Terminal rejection cancels all open stages and tasks.");
      expect(
        document.querySelector('input[name="rejectionPublicLabel"]'),
      ).not.toBeNull();
      await clickButton("Continue");
      await clickButton("Save action");
      const saved = view.update.mock.calls[0][1].graph.stages[0].actions.find(
        (item) => item.stableKey === "REJECT",
      );
      expect(saved?.configuration).toMatchObject({
        outcome: { type: "TERMINAL" },
      });
    } finally {
      await view.cleanup();
    }
  });
});
