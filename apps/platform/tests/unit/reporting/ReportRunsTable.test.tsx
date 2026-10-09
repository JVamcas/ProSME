// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReportRunsTable } from "@/modules/reporting/ui/reports/ReportRunsTable";

vi.mock("@/modules/reporting/ui/reports/useReports", () => ({
  useReportRuns: () => ({
    data: {
      items: [{
        id: "run-1",
        actorId: "00000000-0000-4000-8000-000000000002",
        actorName: "Jane Smith",
        actorEmail: "jane@example.test",
        status: "SUCCEEDED",
        createdAt: "2026-10-09T10:00:00Z",
        startedAt: null,
        finishedAt: null,
        rows: 5,
        format: "CSV",
        error: null,
      }],
      total: 1,
      page: 1,
      pageSize: 20,
    },
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
});

describe("report runs user trigger", () => {
  it("shows the person's full name and email and opens the selected run", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    const onSelect = vi.fn();
    await act(async () => root?.render(
      <ReportRunsTable reportId="report-1" onSelect={onSelect} />,
    ));
    const headers = [...container.querySelectorAll("th")];
    const userColumn = headers.findIndex((header) => header.textContent === "User trigger");
    expect(userColumn).toBeGreaterThanOrEqual(0);
    const cell = container.querySelectorAll("tbody tr")[0].children[userColumn];
    expect(cell.textContent).toContain("Jane Smith");
    expect(cell.textContent).toContain("jane@example.test");
    expect(cell.textContent).not.toContain("00000000-0000-4000-8000-000000000002");
    const openButton = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Open run",
    )!;
    await act(async () => openButton.click());
    expect(onSelect).toHaveBeenCalledWith("run-1");
  });
});
