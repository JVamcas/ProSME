// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { workflowProgressFixture } from "../../../support/WorkflowProgressFixture";
import { WorkflowStageFunnelProgress } from "@/modules/workflows/ui/runtime/WorkflowStageFunnelProgress";
import { clientWorkflowStageFunnelService } from "@/modules/workflows/ui/runtime/ClientWorkflowStageFunnelService";
vi.mock(
  "@/modules/workflows/ui/runtime/ClientWorkflowStageFunnelService",
  () => ({
    clientWorkflowStageFunnelService: {
      summary: vi.fn(),
      applications: vi.fn(),
      download: vi.fn(),
    },
  }),
);
vi.mock("@/shared/ui/Toast", () => ({ toast: { error: vi.fn() } }));

const summary = {
  fundingCallTitle: "SME Growth",
  stages: [
    { stageKey: "eligibility", name: "Eligibility", sequence: 1, count: 120 },
    {
      stageKey: "technical",
      name: "Technical Assessment",
      sequence: 2,
      count: 76,
    },
    { stageKey: "new-stage", name: "New review", sequence: 3, count: 10 },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(clientWorkflowStageFunnelService.summary).mockResolvedValue(
    summary,
  );
  vi.mocked(clientWorkflowStageFunnelService.applications).mockResolvedValue({
    total: 1,
    page: 1,
    pageSize: 25,
    items: [
      {
        applicationId: "app-one",
        reference: "SME-1",
        applicantName: "Sample applicant",
        businessName: "Sample business",
        legalName: "Sample legal",
        registrationNumber: "REG-1",
        businessType: "Company",
        sector: "Retail",
        region: "Khomas",
        reachedAt: "2026-10-01T12:00:00Z",
        submittedAt: "2026-09-01T12:00:00Z",
        fundingCallTitle: "SME Growth",
        stageName: "Eligibility",
        iterationNumber: 2,
        averageScore: 82.5,
        scoreMaximum: 100,
        scoreUnit: "PERCENTAGE",
        comments: "Latest recommendation",
      },
    ],
  });
});
afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

async function render(canExport = true) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  await act(async () => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <WorkflowStageFunnelProgress
          applicationId="app-one"
          progress={workflowProgressFixture}
          canInspect
          canExport={canExport}
        />
      </QueryClientProvider>,
    );
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
  return { container, root, queryClient };
}

describe("stage pipe and applications", () => {
  it("keeps counts and downloads inside the pipe, opens latest-run applications and returns to stage details", async () => {
    const { container, root, queryClient } = await render();
    const count = container.querySelector<HTMLButtonElement>(
      '[aria-label="View 120 applications at Eligibility"]',
    )!;
    const download = container.querySelector(
      '[aria-label="Download applications at Eligibility"]',
    )!;
    expect(count.parentElement).toBe(download.parentElement);
    expect(count.parentElement?.className).not.toContain("bg-brand-green");
    expect(count.closest("li")?.textContent).toContain("Completed");
    expect(container.textContent).toContain("Another workflow version");
    expect(
      clientWorkflowStageFunnelService.applications,
    ).not.toHaveBeenCalled();

    await act(async () => {
      count.click();
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    const applications = container.querySelector(
      '[aria-label="Applications at selected stage"]',
    );
    expect(applications?.textContent).toContain("Sample applicant");
    expect(applications?.textContent).toContain("REG-1");
    expect(applications?.textContent).toContain("82.50%");
    expect(applications?.textContent).toContain("Latest recommendation");
    expect(clientWorkflowStageFunnelService.applications).toHaveBeenCalledWith(
      "app-one",
      { stageKey: "eligibility", page: 1, pageSize: 25 },
      expect.any(AbortSignal),
    );
    const close = [...applications!.querySelectorAll("button")].find(
      (button) => button.textContent === "Stage details",
    );
    await act(async () => close?.click());
    expect(
      container.querySelector('[aria-label="Selected stage details"]'),
    ).not.toBeNull();
    await act(async () => root.unmount());
    queryClient.clear();
  });

  it("downloads the stage from the pipe without switching the details panel", async () => {
    vi.mocked(clientWorkflowStageFunnelService.download).mockResolvedValue(
      new Blob(["Reference\r\nSME-1"]),
    );
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:stage-export");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    const { container, root, queryClient } = await render();
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>(
          '[aria-label="Download applications at Eligibility"]',
        )
        ?.click(),
    );
    expect(clientWorkflowStageFunnelService.download).toHaveBeenCalledWith(
      "app-one",
      "eligibility",
    );
    expect(click).toHaveBeenCalledOnce();
    expect(
      container.querySelector('[aria-label="Applications at selected stage"]'),
    ).toBeNull();
    await act(async () => root.unmount());
    queryClient.clear();
  });

  it("hides download actions without the export grant", async () => {
    const { container, root, queryClient } = await render(false);
    expect(
      container.querySelector('[aria-label^="Download applications"]'),
    ).toBeNull();
    expect(
      container.querySelector(
        '[aria-label="View 120 applications at Eligibility"]',
      ),
    ).not.toBeNull();
    await act(async () => root.unmount());
    queryClient.clear();
  });

  it("shows count failures with retry instead of presenting zero as a result", async () => {
    vi.mocked(clientWorkflowStageFunnelService.summary).mockRejectedValue(
      new Error("Counts unavailable"),
    );
    const { container, root, queryClient } = await render();
    expect(container.textContent).toContain("Counts unavailable");
    expect(
      container.querySelector<HTMLButtonElement>('[aria-label^="View "]')
        ?.disabled,
    ).toBe(true);
    const retry = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Retry counts",
    );
    vi.mocked(clientWorkflowStageFunnelService.summary).mockResolvedValue(
      summary,
    );
    await act(async () => {
      retry?.click();
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    expect(
      container.querySelector(
        '[aria-label="View 120 applications at Eligibility"]',
      ),
    ).not.toBeNull();
    await act(async () => root.unmount());
    queryClient.clear();
  });
});
