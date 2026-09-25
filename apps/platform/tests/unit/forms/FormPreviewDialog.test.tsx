// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { FormEditorView } from "@/modules/forms/FormTypes";
import { fundingApplicationForm } from "@/modules/forms/domain/FundingApplicationForm";
import { FormPreviewDialog } from "@/modules/forms/ui/renderer/FormPreviewDialog";
import { runtimeDefinition } from "../../support/form-runtime";

(
  globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT: boolean;
  }
).IS_REACT_ACT_ENVIRONMENT = true;

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
      displayMode: "SINGLE_PAGE",
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

function fundingApplicationEditorView(): FormEditorView {
  const form = fundingApplicationForm();
  const definitionId = "30000000-0000-4000-8000-000000000003";
  const versionId = "30000000-0000-4000-8000-000000000004";
  return {
    allowedActions: ["CLONE", "RETIRE"],
    definition: {
      active: true,
      code: form.code,
      description: form.description,
      id: definitionId,
      name: form.name,
      updatedAt: "2026-09-20T00:00:00.000Z",
    },
    fields: form.fields,
    sections: form.sections,
    version: {
      createdAt: "2026-09-20T00:00:00.000Z",
      displayMode: "SINGLE_PAGE",
      formDefinitionId: definitionId,
      id: versionId,
      instructions: form.instructions,
      publishedAt: "2026-09-20T00:00:00.000Z",
      retiredAt: null,
      rowVersion: 2,
      status: "PUBLISHED",
      submitLabel: form.submitLabel,
      versionNumber: 1,
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
    editor.sections = editor.sections.map((section) => ({
      ...section,
      columnSpan: 1,
    }));
    await act(async () => {
      root.render(
        <FormPreviewDialog editor={editor} isOpen onClose={vi.fn()} />,
      );
    });

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog?.className).toContain("sm:w-fit");
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
    editor.sections = editor.sections.map((section) => ({
      ...section,
      columnSpan: 2,
    }));
    await act(async () => {
      root.render(
        <FormPreviewDialog editor={editor} isOpen onClose={vi.fn()} />,
      );
    });

    expect(document.querySelector('[role="dialog"]')?.className).toContain(
      "max-w-4xl",
    );

    await act(async () => root.unmount());
  });

  it("caps a three-column preview at the three-column outer width", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    const editor = editorView();
    editor.sections = editor.sections.map((section) => ({
      ...section,
      columnSpan: 3,
    }));
    await act(async () => {
      root.render(
        <FormPreviewDialog editor={editor} isOpen onClose={vi.fn()} />,
      );
    });

    expect(document.querySelector('[role="dialog"]')?.className).toContain(
      "max-w-6xl",
    );

    await act(async () => root.unmount());
  });

  it("previews the published funding application through the generic renderer", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <FormPreviewDialog
          editor={fundingApplicationEditorView()}
          isOpen
          onClose={vi.fn()}
        />,
      );
    });

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain("Funding Application Form preview");
    expect(dialog?.textContent).toContain("Registration and tax information");
    expect(dialog?.textContent).toContain("Declarations and consent");
    expect(dialog?.querySelector('[name="root_PROJECT_TITLE"]')).not.toBeNull();
    expect(dialog?.textContent).toContain("Submit application");

    await act(async () => root.unmount());
  });
});
