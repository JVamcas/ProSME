// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { permissionCodes } from "@/auth/authorization/permissions";
import type { ReportTemplate } from "@/modules/reporting/domain/ReportDefinition";
import { applicationExportTemplate } from "@/modules/reporting/application/bootstrap/ApplicationExportTemplate";
import { ReportTemplateEditor } from "@/modules/reporting/ui/definitions/ReportTemplateEditor";
import {
  changeValue,
  clickButton,
  submit,
} from "../../support/ReportTemplateEditorInteractions";

const state = vi.hoisted(() => ({
  save: vi.fn(),
  replace: vi.fn(),
  template: undefined as ReportTemplate | undefined,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: state.replace }),
}));
vi.mock("@/shared/ui/Toast", () => ({ toast: { error: vi.fn() } }));
vi.mock("@/modules/reporting/ui/definitions/useReportDefinition", () => ({
  useReportDatasets: () => ({
    data: [{ key: "application-data", version: 1, name: "Application Data" }],
  }),
  useReportTemplate: () => ({ data: state.template }),
  useSaveReportTemplate: () => ({ mutateAsync: state.save, isPending: false }),
  useValidateReportTemplate: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/modules/reporting/ui/definitions/ReportSqlEditor", () => ({
  ReportSqlEditor: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (value: string) => void;
  }) => (
    <textarea
      aria-label="SQL"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));
vi.mock(
  "@/modules/reporting/ui/definitions/ReportTemplateValidationForm",
  () => ({
    ReportTemplateValidationForm: () => <p>Validate saved draft</p>,
  }),
);

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | undefined;
afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  document.body.replaceChildren();
  state.template = undefined;
  vi.clearAllMocks();
});

async function renderEditor(canEdit = true) {
  state.save.mockImplementation(async (input) => ({
    ...input,
    id: "saved-template",
    rowVersion: 1,
    publishedVersion: null,
  }));
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(
      <ReportTemplateEditor
        id={state.template?.id}
        permissions={
          canEdit
            ? [
                permissionCodes.reportingTemplateCreateAll,
                permissionCodes.reportingTemplateUpdateAll,
              ]
            : []
        }
      />,
    ),
  );
  return container;
}

async function continueToReview() {
  for (let index = 0; index < 4; index += 1) {
    await clickButton("Continue");
  }
}

describe("template generated keys", () => {
  it("creates a template from its name without displaying a stable-key field", async () => {
    const container = await renderEditor();
    expect(container.querySelector('[name="key"]')).toBeNull();
    expect(container.textContent).not.toContain("Stable key");
    await changeValue('[name="name"]', "New application export");
    await changeValue('[name="description"]', "Export submitted applications.");
    await clickButton("Continue");
    await changeValue(
      'textarea[aria-label="SQL"]',
      "SELECT reference AS columnName FROM app_reporting_dataset_applications_v1",
    );
    await clickButton("Continue");
    await clickButton("Continue");
    await clickButton("Add column");
    await clickButton("Continue");
    const reviewCard = container.querySelector<HTMLElement>(
      "section[aria-labelledby]",
    )!;
    expect(reviewCard.textContent).toContain("New application export");
    expect(reviewCard.textContent).toContain("Export submitted applications.");
    expect(reviewCard.textContent).toContain("Application Data");
    expect(reviewCard.textContent).toContain("0 parameters");
    expect(reviewCard.textContent).toContain("1 column");
    expect(reviewCard.textContent).toContain("XLSX");
    expect(reviewCard.textContent).toContain("CSV");
    await act(async () => {
      reviewCard
        .querySelector<HTMLButtonElement>(
          'button[aria-label="Report template actions"]',
        )!
        .click();
    });
    const saveDraft = document.querySelector<HTMLElement>(
      '[role="menuitem"]',
    )!;
    expect(saveDraft.textContent).toBe("Save Draft");
    await act(async () => {
      saveDraft.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, button: 0 }),
      );
      saveDraft.dispatchEvent(
        new PointerEvent("pointerup", { bubbles: true, button: 0 }),
      );
      saveDraft.click();
    });
    expect(state.save).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "new-application-export",
        name: "New application export",
        description: "Export submitted applications.",
      }),
    );
    expect(state.replace).toHaveBeenCalledWith(
      "/admin/reports/templates-definitions/saved-template",
    );
  });

  it("retains the stored key and row version after renaming a template", async () => {
    state.template = {
      ...applicationExportTemplate,
      id: "existing-template",
      rowVersion: 2,
      publishedVersion: 1,
    };
    const container = await renderEditor();
    expect(container.querySelector('[name="key"]')).toBeNull();
    await changeValue('[name="name"]', "Renamed export");
    await continueToReview();
    expect(container.textContent).not.toContain("Validate saved draft");
    await submit();
    expect(state.save).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "application-export",
        name: "Renamed export",
        description: applicationExportTemplate.description,
        rowVersion: 2,
      }),
    );
    expect(state.replace).not.toHaveBeenCalled();
  });

  it("validates each step and preserves values when navigating back", async () => {
    const container = await renderEditor();
    await clickButton("Continue");
    expect(container.querySelector('[name="name"]')).not.toBeNull();
    expect(container.querySelector('textarea[aria-label="SQL"]')).toBeNull();
    await changeValue('[name="name"]', "Saved across steps");
    await changeValue(
      '[name="description"]',
      "Saved description across steps.",
    );
    await clickButton("Continue");
    await clickButton("Continue");
    expect(
      container.querySelector('textarea[aria-label="SQL"]'),
    ).not.toBeNull();
    await submit();
    expect(state.save).not.toHaveBeenCalled();
    await changeValue('textarea[aria-label="SQL"]', "SELECT reference");
    await clickButton("Continue");
    await clickButton("Back");
    expect(
      container.querySelector<HTMLTextAreaElement>("textarea")!.value,
    ).toBe("SELECT reference");
    await clickButton("Back");
    expect(
      container.querySelector<HTMLInputElement>('[name="name"]')!.value,
    ).toBe("Saved across steps");
    await clickButton("Continue");
    await clickButton("Continue");
    await clickButton("Continue");
    await clickButton("Continue");
    expect(
      container.querySelector('[name="definition.columns.0.name"]'),
    ).toBeNull();
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(container.textContent).not.toContain("Save draft");
  });

  it("removes an output column through ActionMenu and preserves SQL order on save", async () => {
    state.template = {
      ...applicationExportTemplate,
      id: "existing-template",
      rowVersion: 2,
      publishedVersion: 1,
    };
    const container = await renderEditor();
    await clickButton("Continue");
    await clickButton("Continue");
    await clickButton("Continue");
    expect(container.querySelector("table")).not.toBeNull();
    expect(container.textContent).not.toContain("Remove column");
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(
          '[aria-label="Actions for column reference"]',
        )!
        .click(),
    );
    const remove = document.querySelector<HTMLElement>('[role="menuitem"]')!;
    expect(remove.textContent).toBe("Remove column");
    await act(async () => {
      remove.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true, button: 0 }),
      );
      remove.dispatchEvent(
        new PointerEvent("pointerup", { bubbles: true, button: 0 }),
      );
      remove.click();
    });
    expect(
      container.querySelector<HTMLInputElement>(
        '[name="definition.columns.0.name"]',
      )!.value,
    ).toBe("funding_call_title");
    await changeValue('[name="definition.columns.0.name"]', "call_title");
    await clickButton("Continue");
    await submit();
    expect(state.save).toHaveBeenCalledWith(
      expect.objectContaining({
        definition: expect.objectContaining({
          columns: [
            { name: "call_title", type: "text" },
            ...applicationExportTemplate.definition.columns.slice(2),
          ],
        }),
      }),
    );
  });

  it("allows read-only step navigation while disabling edits and saving", async () => {
    state.template = {
      ...applicationExportTemplate,
      id: "existing-template",
      rowVersion: 2,
      publishedVersion: 1,
    };
    const container = await renderEditor(false);
    await clickButton("Continue");
    await clickButton("Continue");
    await clickButton("Continue");
    expect(
      container.querySelector<HTMLInputElement>(
        '[name="definition.columns.0.name"]',
      )!.disabled,
    ).toBe(true);
    const addColumn = [
      ...container.querySelectorAll<HTMLButtonElement>("button"),
    ].find((button) => button.textContent?.trim() === "Add column")!;
    expect(addColumn.disabled).toBe(true);
    await clickButton("Continue");
    expect(container.textContent).not.toContain("Save draft");
    await submit();
    expect(state.save).not.toHaveBeenCalled();
  });
});
