// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { workflowProgressFixture as progress } from "../../support/WorkflowProgressFixture";
import { WorkflowProgressPanel } from "@/modules/workflows/ui/WorkflowProgressPanel";

afterEach(() => document.body.replaceChildren());

async function openVisualFlow(container: HTMLElement) {
  const toggle = [...container.querySelectorAll("button")].find(
    (button) => button.textContent?.trim() === "Show visual flow",
  );
  expect(toggle).toBeDefined();
  await act(async () => toggle!.click());
}

describe("workflow progress panel", () => {
  it("selects the active stage and lets staff inspect another stage", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () =>
      root.render(<WorkflowProgressPanel progress={progress} />),
    );

    await openVisualFlow(container);
    const graph = container.querySelector(
      '[aria-label="Workflow instance visual flow"]',
    );
    expect(graph).not.toBeNull();
    expect(graph?.querySelector("[data-workflow-route]")).not.toBeNull();
    expect(graph?.textContent).toContain("Completed");
    expect(graph?.textContent).toContain("In progress");
    expect(
      graph?.querySelector('[data-workflow-stage="eligibility"]')?.classList,
    ).toContain("border-brand-green");
    expect(
      graph?.querySelector('[data-workflow-stage="technical"]')?.classList,
    ).toContain("border-brand-blue");
    expect(
      graph
        ?.querySelector('g[data-route-taken="true"] path')
        ?.getAttribute("stroke"),
    ).toBe("var(--color-brand-green)");
    expect(graph?.querySelector('[aria-label^="Edit"]')).toBeNull();
    expect(graph?.querySelector('[aria-label^="Delete"]')).toBeNull();
    const details = container.querySelector(
      '[aria-label="Selected stage details"]',
    );
    expect(details?.textContent).toContain("Technical Assessment");
    expect(details?.textContent).toContain("Review proposal");
    expect(details?.textContent).toContain("Reviewer");
    expect(details?.textContent).toContain("reviewer@example.test");
    expect(details?.textContent).toContain("Sector Specialist");
    expect(details?.textContent).toContain("Mandatory");
    const headers = [...(details?.querySelectorAll("th") ?? [])];
    expect(headers.map((header) => header.textContent)).toEqual([
      "Task",
      "Task type",
      "Assigned to",
      "Requirement",
      "Status",
      "Actioned at",
    ]);
    const taskRows = details?.querySelectorAll("tbody tr");
    expect(taskRows?.[0].textContent).toContain("Contributing");
    expect(taskRows?.[1].textContent).toContain("Stage decision");
    expect(
      details?.querySelector('a[href="/admin/tasks/task-one"]'),
    ).not.toBeNull();

    const eligibility = [...graph!.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Eligibility"),
    );
    await act(async () => eligibility?.click());

    expect(details?.textContent).toContain("Check the application.");
    expect(details?.textContent).not.toContain("Review proposal");
    await act(async () => root.unmount());
  });

  it("shows waiting stages and untaken routes in grey", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () =>
      root.render(
        <WorkflowProgressPanel
          progress={{
            ...progress,
            takenPaths: [],
            stages: progress.stages.map((stage) => ({
              ...stage,
              status: "NOT_STARTED",
            })),
          }}
        />,
      ),
    );
    await openVisualFlow(container);
    const graph = container.querySelector(
      '[aria-label="Workflow instance visual flow"]',
    );
    expect(
      graph?.querySelectorAll("[data-workflow-stage].border-slate-400"),
    ).toHaveLength(2);
    expect(graph?.querySelector('g[data-route-taken="true"]')).toBeNull();
    expect(
      graph
        ?.querySelector("g[data-workflow-route] path")
        ?.getAttribute("stroke"),
    ).toBe("#94a3b8");
    await act(async () => root.unmount());
  });

  it("shows one current entry per stage and lets staff inspect run history", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () =>
      root.render(
        <WorkflowProgressPanel
          progress={{
            ...progress,
            stages: [
              {
                ...progress.stages[0],
                tasks: [{ ...progress.stages[1].tasks[0], status: "COMPLETED" }],
              },
              progress.stages[1],
              {
                ...progress.stages[0],
                id: "eligibility-repeated",
                iterationNumber: 2,
                status: "ACTIVE",
                completedAt: null,
              },
            ],
          }}
        />,
      ),
    );
    await openVisualFlow(container);
    const repeated = container.querySelector<HTMLButtonElement>(
      '[data-workflow-stage="eligibility"] button',
    );
    expect(repeated?.parentElement?.classList).toContain("border-brand-blue");
    expect(repeated?.textContent).toContain("Run 2");
    await act(async () => repeated?.click());
    expect(
      container.querySelector('[aria-label="Selected stage details"]')
        ?.textContent,
    ).toContain("Run 2");
    expect(
      container.querySelectorAll('[aria-label="Workflow stages"] li'),
    ).toHaveLength(2);
    expect(container.textContent).toContain("0 completed · 2 active · 2 stages shown");
    const history = container.querySelector("details");
    expect(history?.querySelector("summary")?.textContent).toContain("1 previous");
    await act(async () => history?.querySelector("button")?.click());
    expect(container.querySelector('[aria-label="Selected stage details"]')?.textContent).toContain("Completed");
    expect(container.querySelector('[aria-label="Selected stage details"]')?.textContent).not.toContain("Run 2");
    expect(container.querySelector('[aria-label="Selected stage details"]')?.textContent).toContain("Task assignments (1)");
    expect(container.querySelector('[aria-label="Selected stage details"]')?.textContent).toContain("Reviewer");
    await act(async () => root.unmount());
  });

  it("shows returned work awaiting review with assignments and a return time", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => root.render(
      <WorkflowProgressPanel progress={{
        ...progress,
        stages: [
          { ...progress.stages[0], status: "ACTIVE", iterationNumber: 2 },
          {
            ...progress.stages[1],
            status: "RETURNED",
            returnedAt: "2026-09-21T10:00:00.000Z",
            tasks: progress.stages[1].tasks.map((task) => ({
              ...task,
              status: "CANCELLED",
              canOpen: false,
            })),
          },
        ],
      }} />,
    ));
    const notification = [...container.querySelectorAll<HTMLButtonElement>(
      '[aria-label="Workflow stages"] button',
    )].find((button) => button.textContent?.includes("Technical Assessment"));
    await act(async () => notification?.click());
    const details = container.querySelector('[aria-label="Selected stage details"]');
    expect(details?.textContent).toContain("Returned for correction");
    expect(details?.textContent).toContain("Returned at");
    expect(details?.textContent).toContain("awaits a new review");
    expect(details?.textContent).toContain("Task assignments (2)");
    expect(details?.textContent).not.toContain("Completed");
    expect(details?.textContent).not.toContain("Not yet completed");
    await openVisualFlow(container);
    expect(container.querySelector('[data-workflow-stage="technical"]')?.textContent)
      .toContain("Returned for correction");
    await act(async () => root.unmount());
  });

  it("shows waiting-stage assignments without links to uncreated task instances", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => root.render(
      <WorkflowProgressPanel progress={{
        ...progress,
        stages: [{
          ...progress.stages[1],
          id: null,
          status: "NOT_STARTED",
          activatedAt: null,
          tasks: progress.stages[1].tasks.map((task) => ({
            ...task,
            id: `planned-${task.id}`,
            planned: true,
            configuredReviewerCount: 2,
            status: "WAITING",
            canOpen: false,
          })),
        }],
      }} />,
    ));
    const details = container.querySelector('[aria-label="Selected stage details"]');
    expect(details?.textContent).toContain("Task assignments (2)");
    expect(details?.textContent).toContain("Sector Specialist");
    expect(details?.textContent).toContain("Programme Officer");
    expect(details?.textContent).toContain("Assigned on activation");
    expect(details?.textContent).toContain("Waiting");
    expect(details?.querySelector("a")).toBeNull();
    await act(async () => root.unmount());
  });

  it("highlights only the recorded destination of a parallel transition", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    const graph = progress.graph!;
    await act(async () =>
      root.render(
        <WorkflowProgressPanel
          progress={{
            ...progress,
            graph: {
              stages: [
                ...graph.stages,
                {
                  ...graph.stages[1],
                  stableKey: "financial",
                  name: "Financial review",
                  displayOrder: 3,
                },
              ],
              transitions: [
                {
                  ...graph.transitions[0],
                  targetStageKeys: ["technical", "financial"],
                },
              ],
            },
          }}
        />,
      ),
    );
    await openVisualFlow(container);
    const paths = container.querySelectorAll("g[data-workflow-route]");
    expect(paths).toHaveLength(2);
    expect(
      container.querySelectorAll('g[data-route-taken="true"]'),
    ).toHaveLength(1);
    const untaken = [...paths].find(
      (path) => !path.hasAttribute("data-route-taken"),
    );
    expect(untaken?.querySelector("path")?.getAttribute("stroke")).toBe(
      "#94a3b8",
    );
    expect(
      container.querySelector('[data-workflow-stage="financial"]')?.classList,
    ).toContain("border-slate-400");
    await act(async () => root.unmount());
  });
});
