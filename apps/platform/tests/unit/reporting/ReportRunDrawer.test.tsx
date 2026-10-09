// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ReportArtifact,
  ReportRun,
  ReportRunEvent,
} from "@/modules/reporting/domain/Report";
import { reportRunDrawerFixture } from "../../support/ReportRunDrawerFixture";
import { ReportRunDrawer } from "@/modules/reporting/ui/reports/ReportRunDrawer";

const state = vi.hoisted(() => ({
  detail: undefined as
    | { run: ReportRun; artifacts: ReportArtifact[]; events: ReportRunEvent[] }
    | undefined,
  download: vi.fn(),
  pending: false,
}));

vi.mock("@/modules/reporting/ui/reports/useReports", () => ({
  useRetryReportRun: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useReportRunDetail: () => ({ data: state.detail }),
  useDownloadReportArtifact: () => ({
    mutateAsync: state.download,
    isPending: state.pending,
  }),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
beforeEach(() => {
  state.detail = reportRunDrawerFixture();
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  document.body.replaceChildren();
  state.pending = false;
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

async function renderDrawer(canDownload = false) {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  const close = vi.fn();
  await act(async () => {
    root?.render(
      <ReportRunDrawer
        reportId="report"
        runId="run"
        onClose={close}
        canDownload={canDownload}
      />,
    );
  });
  const drawer = document.querySelector<HTMLElement>('[role="dialog"]')!;
  return { drawer, close };
}

const artifact: ReportArtifact = {
  id: "artifact",
  runId: "run",
  kind: "OUTPUT",
  objectKey: "private/report.xlsx",
  filename: "report.xlsx",
  contentType:
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  bytes: 123,
  checksum: "saved-checksum",
};

describe("report run drawer", () => {
  it("shows the current state without inventing completed lifecycle events", async () => {
    const { drawer } = await renderDrawer();
    expect(drawer.querySelector('[role="status"]')!.textContent).toContain(
      "Preparing source",
    );
    expect(drawer.textContent).not.toContain("PREPARING_SOURCE");
    expect(drawer.textContent).toContain("Africa/Windhoek");
    expect(drawer.textContent).toContain("XLSX");
    expect(drawer.querySelector("ol")).toBeNull();
    const parameters = [...drawer.querySelectorAll("section")].find(
      (section) =>
        section.querySelector("h3")?.textContent === "Resolved parameters",
    )!;
    expect(
      [...parameters.querySelectorAll("dt")].map((label) => label.textContent),
    ).toEqual(["Start Date", "End Date"]);
    expect(parameters.textContent).toContain("2026");
    expect(parameters.textContent).not.toContain("2026-10-06");
  });

  it.each([
    ["QUEUED", "Queued"],
    ["RUNNING", "Generating report"],
    ["SUCCEEDED", "Completed"],
    ["FAILED", "Failed"],
  ] as const)("presents %s runs as %s", async (status, label) => {
    state.detail!.run.status = status;
    state.detail!.run.rows = 0;
    const { drawer } = await renderDrawer();
    expect(drawer.querySelector('[role="status"]')!.textContent).toContain(
      label,
    );
    const rows = [...drawer.querySelectorAll("dt")].find(
      (item) => item.textContent === "Rows",
    )!;
    expect(rows.nextElementSibling?.textContent).toBe("0");
  });

  it("retains recorded lifecycle events, errors, and pending error-file details", async () => {
    state.detail!.run.status = "FAILED";
    state.detail!.run.error = "The source is unavailable.";
    state.detail!.events = [
      {
        key: "reporting.generation.failed",
        occurredAt: "2026-10-09T10:01:00Z",
        metadata: {},
      },
    ];
    const { drawer } = await renderDrawer();
    expect(drawer.querySelector('[role="alert"]')!.textContent).toBe(
      "The source is unavailable.",
    );
    expect(drawer.querySelector("ol")!.textContent).toContain(
      "Generation failed",
    );
    expect(drawer.querySelector("time")!.dateTime).toBe("2026-10-09T10:01:00Z");
    expect(drawer.textContent).toContain("Error file persistence is pending.");
  });

  it("displays actual resolved values without substituting template defaults", async () => {
    state.detail!.run.values = {
      nullable: null,
      enabled: false,
      count: 0,
      text: "",
      list: ["a", "b"],
    };
    const { drawer } = await renderDrawer();
    const parameters = [...drawer.querySelectorAll("section")].find(
      (section) =>
        section.querySelector("h3")?.textContent === "Resolved parameters",
    )!;
    const values = [...parameters.querySelectorAll("dd:first-of-type")].map(
      (item) => item.textContent,
    );
    expect(values).toEqual([
      "No value",
      "false",
      "0",
      "Empty text",
      '["a","b"]',
    ]);
    expect(parameters.textContent).not.toContain("Start Date");
  });

  it("keeps file details visible without offering an unauthorized download", async () => {
    state.detail!.artifacts = [artifact];
    const { drawer } = await renderDrawer();
    expect(drawer.textContent).toContain("report.xlsx");
    expect(drawer.textContent).toContain("SHA-256 saved-checksum");
    expect(
      [...drawer.querySelectorAll("button")].some(
        (button) =>
          button.getAttribute("aria-label") === "Download report.xlsx",
      ),
    ).toBe(false);
    expect(state.download).not.toHaveBeenCalled();
  });

  it("downloads an authorized artifact through the existing mutation", async () => {
    state.detail!.artifacts = [artifact];
    state.download.mockResolvedValue(new Blob(["report bytes"]));
    const createUrl = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:report");
    const revokeUrl = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => {});
    const clickLink = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    const { drawer } = await renderDrawer(true);
    vi.useFakeTimers();
    await act(async () => {
      [...drawer.querySelectorAll<HTMLButtonElement>("button")]
        .find(
          (button) =>
            button.getAttribute("aria-label") === "Download report.xlsx",
        )!
        .click();
    });
    expect(state.download).toHaveBeenCalledWith({
      runId: "run",
      artifactId: "artifact",
    });
    expect(createUrl).toHaveBeenCalledOnce();
    expect(clickLink).toHaveBeenCalledOnce();
    vi.runOnlyPendingTimers();
    expect(revokeUrl).toHaveBeenCalledWith("blob:report");
  });

  it("groups the failed run and error attachment before its lifecycle and parameters", async () => {
    state.detail!.run.status = "FAILED";
    state.detail!.run.error =
      "Report generation or private file persistence failed.";
    state.detail!.artifacts = [
      {
        ...artifact,
        kind: "ERROR",
        filename: "report-run-error.txt",
        contentType: "text/plain",
      },
    ];
    state.detail!.events = [
      {
        key: "reporting.generation.started",
        occurredAt: "2026-10-09T10:00:00Z",
        metadata: {},
      },
      {
        key: "reporting.generation.failed",
        occurredAt: "2026-10-09T10:01:00Z",
        metadata: {},
      },
    ];
    const { drawer } = await renderDrawer(true);
    const status = drawer.querySelector('[role="status"]')!;
    expect(status.textContent).toContain("Generation failed");
    expect(status.querySelector('[role="alert"]')!.textContent).toBe(
      state.detail!.run.error,
    );
    expect(
      [...drawer.querySelectorAll("h3")].map((heading) => heading.textContent),
    ).toEqual(["Error file", "Lifecycle", "Resolved parameters"]);
    expect(
      [...drawer.querySelectorAll("ol li p")].map((event) => event.textContent),
    ).toEqual(["Generation started", "Generation failed"]);
    expect(drawer.textContent).not.toContain(
      "Error file persistence is pending.",
    );
    expect(drawer.textContent).not.toContain("reporting.generation.");
  });

  it("keeps checksums collapsed until the file integrity disclosure is opened", async () => {
    state.detail!.artifacts = [artifact];
    const { drawer } = await renderDrawer();
    const disclosure = drawer.querySelector("details")!;
    expect(disclosure.open).toBe(false);
    const summary = disclosure.querySelector("summary")!;
    expect(summary.textContent).toContain("File integrity (SHA-256)");
    await act(async () => summary.click());
    expect(disclosure.open).toBe(true);
    expect(disclosure.querySelector("p")!.textContent).toContain(
      artifact.checksum,
    );
    await act(async () => summary.click());
    expect(disclosure.open).toBe(false);
  });

  it("disables artifact downloads while a download is pending", async () => {
    state.detail!.artifacts = [artifact];
    state.pending = true;
    const { drawer } = await renderDrawer(true);
    const button = drawer.querySelector<HTMLButtonElement>(
      'button[aria-label="Download report.xlsx"]',
    )!;
    expect(button.disabled).toBe(true);
    await act(async () => button.click());
    expect(state.download).not.toHaveBeenCalled();
  });

  it("shows an empty parameter list without inventing resolved values", async () => {
    state.detail!.run.values = {};
    const { drawer } = await renderDrawer();
    expect(drawer.textContent).toContain("This run has no parameters.");
  });

  it("keeps the shared drawer's Escape close behavior", async () => {
    const { close } = await renderDrawer();
    expect(document.body.style.overflow).toBe("hidden");
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(close).toHaveBeenCalledOnce();
  });
});
