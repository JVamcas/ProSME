// @vitest-environment happy-dom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { permissionCodes } from "@/auth/authorization/permissions";
import type { ConfiguredReportDetails } from "@/modules/reporting/domain/Report";
import { applicationAgeingTemplate } from "@/modules/reporting/application/bootstrap/ApplicationAgeingTemplate";
import { ReportDetailWorkspace } from "@/modules/reporting/ui/reports/ReportDetailWorkspace";

const state = vi.hoisted(() => ({
  report: {} as ConfiguredReportDetails,
  save: vi.fn(),
  run: vi.fn(),
  runDefaultsError: null as string | null,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("@/shared/ui/Toast", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));
vi.mock("@/modules/reporting/ui/reports/useReports", () => ({
  useReport: () => ({
    data: {
      ...state.report,
      runDefaults: state.runDefaultsError ? null : state.report.defaults.values,
      runDefaultsError: state.runDefaultsError,
    },
  }),
  useSaveReport: () => ({ mutateAsync: state.save, isPending: false }),
  useRunReport: () => ({ mutateAsync: state.run, isPending: false }),
}));
vi.mock("@/modules/reporting/ui/definitions/useReportDefinition", () => ({
  useReportTemplates: () => ({
    data: {
      items: [
        {
          id: state.report.templateId,
          name: state.report.templateName,
          publishedVersion: 1,
        },
      ],
    },
  }),
  usePublishedReportTemplate: () => ({
    data: { definition: state.report.definition },
  }),
}));
vi.mock("@/modules/reporting/ui/reports/ReportRunsTable", () => ({
  ReportRunsTable: ({ actions }: { actions?: ReactNode }) => (
    <div>
      {actions}
      Report runs
    </div>
  ),
}));
vi.mock("@/modules/reporting/ui/reports/ReportRunDrawer", () => ({
  ReportRunDrawer: ({ runId }: { runId?: string }) =>
    runId ? <div role="dialog">Report run {runId}</div> : null,
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

async function render(
  permissions: string[] = [
    permissionCodes.reportingReportUpdateAll,
    permissionCodes.reportingTemplateReadAll,
  ],
  runDefaultsError: string | null = null,
) {
  state.runDefaultsError = runDefaultsError;
  state.run.mockResolvedValue({ id: "queued-run" });
  state.report = {
    id: "report",
    key: "application-ageing",
    name: "My ageing report",
    description: "Active applications and their elapsed time.",
    templateId: "6e3d5d45-5fc7-4bf4-bbee-dc1046e69d05",
    templateName: "Application Ageing",
    templateVersion: 1,
    datasetName: "Workflow Operations",
    defaults: {
      period: "explicit",
      values: { fundingCallId: null, stageCode: null, minimumAgeHours: 0 },
    },
    format: "XLSX",
    ownerId: "owner",
    rowVersion: 1,
    reportVersion: 1,
    definition: applicationAgeingTemplate.definition,
  };
  state.save.mockImplementation(async (input) => {
    state.report = { ...state.report, ...input, rowVersion: 2 };
    return { id: state.report.id };
  });
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(
      <ReportDetailWorkspace id="report" permissions={permissions} />,
    ),
  );
  return container;
}

async function click(text: string) {
  const button = [
    ...document.querySelectorAll<HTMLElement>('button, [role="tab"]'),
  ].find((item) => item.textContent?.trim() === text)!;
  expect(button).toBeDefined();
  await act(async () => button.click());
}

async function rename(value: string) {
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

describe("report configuration read view and drawer", () => {
  it("shows the saved settings and template's own name without editable fields", async () => {
    const container = await render();
    expect(container.textContent).toContain("My ageing report");
    expect(container.textContent).toContain("Application Ageing");
    expect(container.textContent).toContain("Workflow Operations");
    expect(container.textContent).toContain("Excel (.xlsx)");
    expect(container.textContent).toContain("Current snapshot");
    expect(container.textContent).toContain("0 hours");
    expect(container.textContent).toContain("No value set");
    expect(container.querySelector("input, select, textarea")).toBeNull();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it("opens the real form in the right drawer and discards cancelled edits", async () => {
    await render();
    await click("Edit report");
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
      "Edit report",
    );
    await rename("Unsaved report");
    await click("Cancel");
    expect(state.save).not.toHaveBeenCalled();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    await click("Edit report");
    expect(
      document.querySelector<HTMLInputElement>('[name="name"]')?.value,
    ).toBe("My ageing report");
  });

  it("closes after saving and refreshes the read card", async () => {
    const container = await render();
    await click("Edit report");
    await rename("Saved ageing report");
    await submit();
    expect(state.save).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Saved ageing report", rowVersion: 1 }),
    );
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(container.textContent).toContain("Saved ageing report");
  });

  it("keeps failed edits open for correction", async () => {
    await render();
    state.save.mockRejectedValue(new Error("Report changed"));
    await click("Edit report");
    await rename("Retry report");
    await submit();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(
      document.querySelector<HTMLInputElement>('[name="name"]')?.value,
    ).toBe("Retry report");
  });

  it.each([
    { permissions: [] },
    { permissions: [permissionCodes.reportingReportUpdateAll] },
    { permissions: [permissionCodes.reportingTemplateReadAll] },
  ])("requires both edit permissions: %j", async ({ permissions }) => {
    const container = await render(permissions);
    expect(container.textContent).not.toContain("Edit report");
    expect(container.textContent).toContain("Default parameters");
  });

  it("opens manual runs from the Runs tab in the right drawer", async () => {
    const container = await render([
      permissionCodes.reportingReportRunAll,
      permissionCodes.reportingRunReadAll,
    ]);
    expect(document.querySelector("form")).toBeNull();
    expect(
      container.querySelector('[role="tabpanel"]:not([inert])')?.textContent,
    ).not.toContain("Run report");
    await click("Runs");
    expect(container.textContent).toContain("Report runs");
    await click("Run report");
    const drawer = document.querySelector('[role="dialog"]')!;
    expect(drawer.textContent).toContain("Run report");
    expect(drawer.querySelector("form")).not.toBeNull();
    expect(
      drawer.querySelector<HTMLInputElement>('input[type="number"]')?.value,
    ).toBe("0");
    await click("Cancel");
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(state.run).not.toHaveBeenCalled();
  });

  it("closes the form and opens the queued run after submitting", async () => {
    await render([
      permissionCodes.reportingReportRunAll,
      permissionCodes.reportingRunReadAll,
    ]);
    await click("Runs");
    await click("Run report");
    await submit();
    expect(state.run).toHaveBeenCalledWith({
      idempotencyKey: expect.any(String),
      values: { fundingCallId: null, stageCode: null, minimumAgeHours: 0 },
      format: "XLSX",
    });
    expect(document.querySelector("form")).toBeNull();
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
      "Report run queued-run",
    );
  });

  it("keeps failed runs open with their parameter values", async () => {
    await render([permissionCodes.reportingReportRunAll]);
    state.run.mockRejectedValue(new Error("Run failed"));
    await click("Runs");
    await click("Run report");
    await submit();
    expect(state.run).toHaveBeenCalledOnce();
    expect(document.querySelector('[role="dialog"] form')).not.toBeNull();
  });

  it("allows manual runs without fetching or opening run history", async () => {
    const container = await render([permissionCodes.reportingReportRunAll]);
    await click("Runs");
    expect(container.textContent).not.toContain("Report runs");
    await click("Run report");
    await submit();
    expect(state.run).toHaveBeenCalledOnce();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it("keeps history readable without offering manual runs", async () => {
    const container = await render([permissionCodes.reportingRunReadAll]);
    await click("Runs");
    expect(container.textContent).toContain("Report runs");
    expect(container.textContent).not.toContain("Run report");
    expect(document.querySelector("form")).toBeNull();
  });

  it("hides the Runs tab without run or history permissions", async () => {
    await render([]);
    expect(
      [...document.querySelectorAll('[role="tab"]')].map(
        (tab) => tab.textContent,
      ),
    ).toEqual(["Configuration"]);
  });

  it("shows defaults errors in Runs and disables manual runs", async () => {
    const container = await render(
      [permissionCodes.reportingReportRunAll],
      "Default parameters could not be resolved.",
    );
    await click("Runs");
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "Default parameters could not be resolved.",
    );
    const runButton = [...container.querySelectorAll("button")].find(
      (button) => button.textContent?.trim() === "Run report",
    );
    expect(runButton?.disabled).toBe(true);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
});
