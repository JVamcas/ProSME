// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

import type {
  WorkflowEditorView,
  WorkflowStageInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { WorkflowStageFlow } from "@/modules/workflows/ui/definitions/WorkflowStageFlow";
import { referenceWorkflow } from "../../../support/ReferenceWorkflowFixture";

vi.mock("@/modules/workflows/ui/definitions/WorkflowStageDialog", () => ({
  WorkflowStageDialog: ({ stage }: { stage: WorkflowStageInput }) => (
    <div data-edit-stage={stage.stableKey} />
  ),
}));

vi.mock("@/modules/workflows/ui/definitions/WorkflowStageDeletionDialog", () => ({
  WorkflowStageDeletionDialog: ({ stageKey }: { stageKey: string }) => (
    <div data-delete-stage={stageKey} />
  ),
}));

(globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT: boolean;
}).IS_REACT_ACT_ENVIRONMENT = true;

async function mount(canEdit: boolean, stageCount = 2) {
  const editor: WorkflowEditorView = {
    allowedActions: [],
    definition: {
      id: "definition",
      code: "REFERENCE",
      name: "Reference",
      description: "",
    },
    graph: {
      stages: referenceWorkflow.stages.slice(0, stageCount),
      transitions: [],
    },
    validation: { valid: true, errors: [], warnings: [] },
    version: {
      id: "version",
      number: 1,
      status: "DRAFT",
      rowVersion: 1,
      createdAt: "2026-09-14T00:00:00.000Z",
      publishedAt: null,
      retiredAt: null,
    },
  };
  const client = new QueryClient();
  const container = document.createElement("div");
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <WorkflowStageFlow canEdit={canEdit} editor={editor} />
      </QueryClientProvider>,
    );
  });
  await act(async () => {
    container.querySelector<HTMLButtonElement>("button[aria-expanded]")!
      .click();
  });
  const stage = editor.graph.stages.at(-1)!;
  const edit = container.querySelector<HTMLButtonElement>(
    `[aria-label="Edit ${stage.name}"]`,
  )!;
  const remove = container.querySelector<HTMLButtonElement>(
    `[aria-label="Delete ${stage.name}"]`,
  )!;
  return {
    container,
    edit,
    remove,
    stage,
    cleanup: async () => {
      await act(async () => root.unmount());
      client.clear();
    },
  };
}

describe("stage card actions in the workflow editor", () => {
  it("opens edit and deletion dialogs for a card that is not selected", async () => {
    const view = await mount(true);
    try {
      expect(view.edit).not.toBeNull();
      expect(view.remove).not.toBeNull();
      expect(view.edit.disabled).toBe(false);
      expect(view.remove.disabled).toBe(false);
      await act(async () => view.edit.click());
      expect(view.container.querySelector("[data-edit-stage]")?.getAttribute(
        "data-edit-stage",
      )).toBe(view.stage.stableKey);
      await act(async () => view.remove.click());
      expect(view.container.querySelector("[data-delete-stage]")?.getAttribute(
        "data-delete-stage",
      )).toBe(view.stage.stableKey);
    } finally {
      await view.cleanup();
    }
  });

  it.each([
    { canEdit: false, stageCount: 2, editDisabled: true },
    { canEdit: true, stageCount: 1, editDisabled: false },
  ])("disables unavailable actions: %j", async (options) => {
    const view = await mount(options.canEdit, options.stageCount);
    try {
      expect(view.edit.disabled).toBe(options.editDisabled);
      expect(view.remove.disabled).toBe(true);
      await act(async () => view.remove.click());
      expect(view.container.querySelector("[data-delete-stage]")).toBeNull();
    } finally {
      await view.cleanup();
    }
  });
});
