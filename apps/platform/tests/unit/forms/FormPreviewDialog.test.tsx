// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FormEditorView } from "@/modules/forms/FormTypes";
import { FormPreviewDialog } from "@/modules/forms/ui/renderer/FormPreviewDialog";
import { runtimeDefinition } from "../../support/form-runtime";

(globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT: boolean;
}).IS_REACT_ACT_ENVIRONMENT = true;

function editorView(): FormEditorView {
  const runtime = runtimeDefinition();
  return {
    allowedActions: ["UPDATE", "PUBLISH", "CLONE"],
    definition: {
      active: true,
      code: "FINANCE_REVIEW",
      description: "Finance review form",
      id: "30000000-0000-4000-8000-000000000001",
      name: "Finance Review",
      updatedAt: "2026-09-19T00:00:00.000Z",
    },
    fields: runtime.fields,
    sections: runtime.sections,
    version: {
      createdAt: "2026-09-19T00:00:00.000Z",
      formDefinitionId: "30000000-0000-4000-8000-000000000001",
      id: runtime.versionId,
      instructions: runtime.instructions,
      publishedAt: null,
      retiredAt: null,
      rowVersion: 1,
      status: "DRAFT",
      submitLabel: runtime.submitLabel,
      versionNumber: runtime.versionNumber,
    },
    versions: [],
  };
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("form preview dialog", () => {
  it("renders the current editor version through the runtime renderer", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    const editor = editorView();
    editor.fields = editor.fields.map((field) => ({
      ...field,
      columnSpan: 1,
    }));
    await act(async () => {
      root.render(
        <FormPreviewDialog
          editor={editor}
          isOpen
          onClose={vi.fn()}
        />,
      );
    });

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog?.className).toContain("max-w-xl");
    expect(dialog?.textContent).toContain("Finance Review preview");
    expect(dialog?.textContent).toContain("Preview only");
    expect(dialog?.querySelector('[name="root_NAME"]')).not.toBeNull();
    expect(dialog?.textContent).toContain("Submit form");

    await act(async () => root.unmount());
  });

  it("fits a two-column preview without excess dialog width", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    const editor = editorView();
    editor.fields = editor.fields.map((field, index) => ({
      ...field,
      columnSpan: index === 0 ? 2 : 1,
    }));
    await act(async () => {
      root.render(
        <FormPreviewDialog
          editor={editor}
          isOpen
          onClose={vi.fn()}
        />,
      );
    });

    expect(document.querySelector('[role="dialog"]')?.className)
      .toContain("max-w-2xl");

    await act(async () => root.unmount());
  });

  it("does not widen for unused section columns", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    const editor = editorView();
    editor.sections = editor.sections.map((section) => ({
      ...section,
      columnSpan: 3,
    }));
    editor.fields = editor.fields.map((field, index) => ({
      ...field,
      columnSpan: index === 0 ? 2 : 1,
    }));
    await act(async () => {
      root.render(
        <FormPreviewDialog
          editor={editor}
          isOpen
          onClose={vi.fn()}
        />,
      );
    });

    expect(document.querySelector('[role="dialog"]')?.className)
      .toContain("max-w-2xl");

    await act(async () => root.unmount());
  });
});
