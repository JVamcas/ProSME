// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { WorkflowEditorView } from "@/modules/workflows/domain/definitions/WorkflowTypes";
import type { WorkflowTaskSectionId } from "@/modules/workflows/domain/definitions/WorkflowTaskSectionOrder";

const state = vi.hoisted(() => ({
  mutate: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
  rowVersion: 0,
  preview: {} as {
    task: { config: unknown };
    onSectionOrderChange?: (order: WorkflowTaskSectionId[]) => void;
  },
}));
vi.mock("@/modules/workflows/WorkflowHooks", () => ({
  useSaveWorkflowGraph: (editor: WorkflowEditorView) => {
    state.rowVersion = editor.version.rowVersion;
    return { mutateAsync: state.mutate, isPending: false };
  },
}));
vi.mock("sonner", () => ({ toast: { success: state.success, error: state.error } }));
vi.mock("@/modules/workflows/ui/definitions/WorkflowTaskPreviewDialog", () => ({
  WorkflowTaskPreviewDialog: (props: typeof state.preview) => {
    state.preview = props;
    return null;
  },
}));

import { WorkflowTaskOrderPreview } from "@/modules/workflows/ui/definitions/WorkflowTaskOrderPreview";
import { referenceWorkflow } from "../../../support/ReferenceWorkflowFixture";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
afterEach(() => vi.clearAllMocks());

function fixture(): WorkflowEditorView {
  const graph = structuredClone(referenceWorkflow);
  graph.stages[0].tasks[0].config = { displayMode: "STEP_PROGRESS", custom: "preserved" };
  return {
    allowedActions: [],
    definition: { id: "template", code: "REFERENCE", name: "Reference", description: "" },
    version: {
      id: "draft", number: 1, status: "DRAFT", rowVersion: 1,
      createdAt: "2026-10-12T00:00:00.000Z", publishedAt: null, retiredAt: null,
    },
    graph,
    validation: { valid: true, errors: [], warnings: [] },
  };
}

async function mount(editor = fixture(), canEdit = true) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(
    <WorkflowTaskOrderPreview
      canEdit={canEdit}
      editor={editor}
      onClose={() => undefined}
      stageKey={editor.graph.stages[0].stableKey}
      taskKey={editor.graph.stages[0].tasks[0].stableKey}
    />,
  ));
  return async () => {
    await act(async () => root.unmount());
    container.remove();
  };
}

const order: WorkflowTaskSectionId[] = ["documents", "form", "checklist"];

describe("task order persistence from preview", () => {
  it("saves only the selected task config and uses the returned version for subsequent saves", async () => {
    const editor = fixture();
    state.mutate.mockImplementation(async (graph) => ({
      ...editor, graph, version: { ...editor.version, rowVersion: state.rowVersion + 1 },
    }));
    const cleanup = await mount(editor);
    try {
      await act(async () => state.preview.onSectionOrderChange!(order));
      const graph = state.mutate.mock.calls[0][0];
      expect(graph.stages[0].tasks[0].config).toEqual({
        displayMode: "STEP_PROGRESS", custom: "preserved", sectionOrder: order,
      });
      expect(graph.stages.slice(1)).toEqual(editor.graph.stages.slice(1));
      expect(graph.transitions).toEqual(editor.graph.transitions);
      expect(state.preview.task.config).toEqual(graph.stages[0].tasks[0].config);
      expect(state.rowVersion).toBe(2);
      await act(async () => state.preview.onSectionOrderChange!(["checklist", "documents", "form"]));
      expect(state.rowVersion).toBe(3);
      expect(editor.graph.stages[0].tasks[0].config).not.toHaveProperty("sectionOrder");
      await cleanup();
      const reopened = await mount({ ...editor, graph });
      expect(state.preview.task.config).toHaveProperty("sectionOrder", order);
      await reopened();
    } catch (error) {
      await cleanup();
      throw error;
    }
  });

  it("retains the saved order when the update fails", async () => {
    state.mutate.mockRejectedValue(new Error("Draft changed. Reload and retry."));
    const cleanup = await mount();
    try {
      await act(async () => state.preview.onSectionOrderChange!(order));
      expect(state.preview.task.config).not.toHaveProperty("sectionOrder");
      expect(state.error).toHaveBeenCalledWith("Draft changed. Reload and retry.");
      expect(state.success).not.toHaveBeenCalled();
    } finally {
      await cleanup();
    }
  });

  it.each([false, true])("does not enable reordering without draft edit access: %s", async (published) => {
    const editor = fixture();
    if (published) editor.version.status = "PUBLISHED";
    const cleanup = await mount(editor, published);
    try {
      expect(state.preview.onSectionOrderChange).toBeUndefined();
      expect(state.mutate).not.toHaveBeenCalled();
    } finally {
      await cleanup();
    }
  });
});
