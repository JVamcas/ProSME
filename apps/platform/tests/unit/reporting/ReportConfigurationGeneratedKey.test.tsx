// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ConfiguredReport } from "@/modules/reporting/domain/Report";
import { applicationPipelineTemplate } from "@/modules/reporting/application/bootstrap/ApplicationPipelineTemplate";
import { ReportConfigurationForm } from "@/modules/reporting/ui/reports/ReportConfigurationForm";
import { toast } from "@/shared/ui/Toast";

const state = vi.hoisted(() => ({
  save: vi.fn(),
  replace: vi.fn(),
  templateId: "6e3d5d45-5fc7-4bf4-bbee-dc1046e69d05",
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: state.replace }),
}));
vi.mock("@/shared/ui/Toast", () => ({ toast: { error: vi.fn() } }));
vi.mock("@/modules/reporting/ui/reports/useReports", () => ({
  useSaveReport: () => ({ mutateAsync: state.save, isPending: false }),
}));
vi.mock("@/modules/reporting/ui/definitions/useReportDefinition", () => ({
  useReportTemplates: () => ({
    data: {
      items: [
        {
          id: state.templateId,
          name: "Application Pipeline",
          publishedVersion: 1,
        },
      ],
    },
  }),
  usePublishedReportTemplate: () => ({
    data: { definition: applicationPipelineTemplate.definition },
  }),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | undefined;
afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  document.body.replaceChildren();
  vi.clearAllMocks();
});

async function renderForm(report?: ConfiguredReport) {
  state.save.mockImplementation(async (input) => ({
    ...input,
    id: "saved-report",
  }));
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(<ReportConfigurationForm report={report} />),
  );
  return container;
}

async function changeName(value: string) {
  const input = document.querySelector<HTMLInputElement>('[name="name"]')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function submit() {
  await act(async () =>
    document
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
}

describe("configured report generated keys", () => {
  it("creates a report from its name without a stable-key field", async () => {
    const container = await renderForm();
    expect(container.querySelector('[name="key"]')).toBeNull();
    expect(container.textContent).not.toContain("Stable key");
    await changeName("Monthly pipeline");
    const description = container.querySelector<HTMLTextAreaElement>(
      '[name="description"]',
    )!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )!.set!.call(description, "Current application counts by stage.");
      description.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const select = [...container.querySelectorAll("select")].find((element) =>
      [...element.options].some((option) => option.value === state.templateId),
    )!;
    expect(select).toBeDefined();
    await act(async () => {
      select.value = state.templateId;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await submit();
    expect(state.save).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "monthly-pipeline",
        name: "Monthly pipeline",
        description: "Current application counts by stage.",
        templateId: state.templateId,
        format: "XLSX",
      }),
    );
    expect(state.replace).toHaveBeenCalledWith("/admin/reports/saved-report");
  });

  it("preserves the stored key, pinned template and row version after renaming", async () => {
    const report: ConfiguredReport = {
      id: "existing-report",
      key: "application-pipeline",
      name: "Pipeline",
      description: "Current application counts by stage.",
      templateId: state.templateId,
      templateVersion: 1,
      defaults: { period: "explicit", values: {} },
      format: "XLSX",
      ownerId: "owner",
      rowVersion: 4,
      definition: applicationPipelineTemplate.definition,
    };
    const container = await renderForm(report);
    expect(container.querySelector('[name="key"]')).toBeNull();
    await changeName("Renamed pipeline");
    await submit();
    expect(state.save).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "application-pipeline",
        name: "Renamed pipeline",
        description: report.description,
        templateId: report.templateId,
        templateVersion: 1,
        rowVersion: 4,
      }),
    );
  });

  it("shows invalid form submissions through the existing toast", async () => {
    await renderForm();
    await submit();
    expect(state.save).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(
      "Check the highlighted fields and parameter values.",
    );
  });
});
