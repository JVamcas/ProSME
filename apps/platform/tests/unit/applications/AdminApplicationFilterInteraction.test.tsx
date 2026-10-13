// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { StaffApplicationsTable } from "@/modules/applications/ui/staff/StaffApplicationsTable";
const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  download: vi.fn(),
  options: {
    isPending: true,
    data: undefined as
      | undefined
      | {
          fundingCalls: { id: string; label: string }[];
          stages: { id: string; label: string }[];
        },
  },
}));
vi.mock("@/modules/applications/ui/useApplications", () => ({
  useAdminApplications: mocks.list,
}));
vi.mock("@/modules/applications/ui/useAdminApplicationTools", () => ({
  useAdminApplicationFilterOptions: () => mocks.options,
  useExportAdminApplications: () => ({ mutateAsync: mocks.download }),
}));
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
const callId = "30000000-0000-4000-8000-000000000003";
const initial = {
  fundingCallId: callId,
  stage: "Screening",
  status: "all" as const,
};
let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.options = { isPending: true, data: undefined };
  mocks.list.mockReturnValue({
    data: { items: [], total: 0, nextCursor: "page-2" },
  });
  // Reject the download after capturing its input, avoiding a browser navigation.
  mocks.download.mockRejectedValue(new Error("Test download stopped"));
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});
async function click(text: string) {
  const button = [...container.querySelectorAll("button")].find(
    (node) => node.textContent === text,
  );
  expect(button, text).toBeDefined();
  await act(async () => button!.click());
}
async function renderLoaded() {
  await act(async () =>
    root.render(<StaffApplicationsTable initialFilters={initial} canExport />),
  );
  mocks.options = {
    isPending: false,
    data: {
      fundingCalls: [{ id: callId, label: "Growth call" }],
      stages: [
        { id: "Screening", label: "Screening" },
        { id: "Decision", label: "Decision" },
      ],
    },
  };
  await act(async () =>
    root.render(<StaffApplicationsTable initialFilters={initial} canExport />),
  );
}
it("retains initial selections when dropdown options finish loading", async () => {
  await renderLoaded();
  expect(
    container.querySelector<HTMLSelectElement>('[name="fundingCallId"]')?.value,
  ).toBe(callId);
  expect(
    container.querySelector<HTMLSelectElement>('[name="stage"]')?.value,
  ).toBe("Screening");
});
it("exports applied filters until edits are applied, then clears both new filters", async () => {
  await renderLoaded();
  const stage = container.querySelector<HTMLSelectElement>('[name="stage"]')!;
  await act(async () => {
    stage.value = "Decision";
    stage.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await click("Export CSV");
  expect(mocks.download).toHaveBeenLastCalledWith(
    expect.objectContaining({ ...initial, format: "CSV" }),
  );
  await click("Apply filters");
  expect(mocks.list).toHaveBeenLastCalledWith(
    expect.objectContaining({
      fundingCallId: callId,
      stage: "Decision",
      after: undefined,
    }),
  );
  await click("Export Excel");
  expect(mocks.download).toHaveBeenLastCalledWith(
    expect.objectContaining({
      fundingCallId: callId,
      stage: "Decision",
      format: "XLSX",
    }),
  );
  await click("Clear filters");
  expect(mocks.list).toHaveBeenLastCalledWith({
    status: "all",
    after: undefined,
    limit: 25,
  });
  expect(stage.value).toBe("");
  expect(
    container.querySelector<HTMLSelectElement>('[name="fundingCallId"]')?.value,
  ).toBe("");
});
it("hides export controls without the export permission", async () => {
  await act(async () => root.render(<StaffApplicationsTable />));
  expect(container.textContent).not.toContain("Export CSV");
  expect(container.textContent).not.toContain("Export Excel");
});
