// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { workflowProgressFixture as progress } from "../../support/WorkflowProgressFixture";
import { WorkflowProgressPanel } from "@/modules/workflows/ui/WorkflowProgressPanel";



afterEach(() => document.body.replaceChildren());

describe("workflow progress panel", () => {
  it("selects the active stage and lets staff inspect another stage", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () =>
      root.render(<WorkflowProgressPanel progress={progress} />),
    );

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
      "Action required",
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

  it("uses the latest stage run while retaining earlier runs in the stage list", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () =>
      root.render(
        <WorkflowProgressPanel
          progress={{
            ...progress,
            stages: [
              ...progress.stages,
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
    ).toHaveLength(3);
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
