// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorkflowStageScoringTable } from "@/modules/workflows/ui/definitions/WorkflowStageScoringTable";
import type {
  WorkflowEditorView,
  WorkflowGraphInput,
} from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { referenceWorkflow } from "../../support/ReferenceWorkflowFixture";

const { saveGraph } = vi.hoisted(() => ({
  saveGraph: vi.fn<(graph: WorkflowGraphInput) => Promise<void>>(
    async () => undefined,
  ),
}));

vi.mock("@/modules/workflows/WorkflowHooks", () => ({
  useSaveWorkflowGraph: () => ({
    mutateAsync: saveGraph,
    isPending: false,
    error: null,
  }),
}));

afterEach(() => {
  document.body.replaceChildren();
});

describe("workflow stage scoring table", () => {
  it("renders scoring fields through the shared data table", async () => {
    const stage = structuredClone(referenceWorkflow.stages[0]);
    stage.scoring = [
      {
        aggregation: "WEIGHTED_AVERAGE",
        taskStableKey: "PRE_SCREEN_CHECKLIST",
        criteria: [
          {
            stableKey: "BUSINESS_VIABILITY",
            criterion: "Business viability",
            description: "Assess viability.",
            weight: 60,
            scaleMinimum: 0,
            scaleMaximum: 10,
            mandatoryComment: true,
          },
        ],
      },
    ];
    const editor = {
      allowedActions: ["UPDATE"],
      assignmentOptions: { roles: [], users: [] },
      definition: {
        id: "definition",
        code: "REFERENCE",
        name: "Reference",
        description: "",
      },
      graph: { ...referenceWorkflow, stages: [stage] },
      validation: { valid: true, errors: [], warnings: [] },
      version: {
        id: "version",
        number: 1,
        status: "DRAFT",
        rowVersion: 1,
        createdAt: "2026-09-14T00:00:00.000Z",
        publishedAt: null,
        retiredAt: null,
      },
    } satisfies WorkflowEditorView;
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () =>
      root.render(
        <QueryClientProvider client={new QueryClient()}>
          <WorkflowStageScoringTable
            canEdit
            editor={editor}
            onAdd={vi.fn()}
            onDelete={vi.fn()}
            onEdit={vi.fn()}
            stage={stage}
          />
        </QueryClientProvider>,
      ),
    );

    expect(container.textContent).toContain("Weighted average");
    expect(container.textContent).toContain("Workflow task");
    expect(container.textContent).toContain("Pre-screening checklist");
    expect(container.textContent).toContain("Business viability");
    expect(container.textContent).toContain("Assess viability.");
    expect(container.textContent).toContain("0–10");
    expect(container.textContent).not.toContain("Threshold");
    expect(container.textContent).toContain("Mandatory comment");

    const secondTask = {
      ...stage.tasks[0],
      taskType: "CONTRIBUTING" as const,
      stableKey: "FINANCIAL_REVIEW",
      name: "Financial review",
      displayOrder: 2,
    };
    stage.tasks.push(secondTask);
    stage.scoring.push({
      taskStableKey: secondTask.stableKey,
      aggregation: "SUM",
      criteria: [
        {
          ...stage.scoring[0].criteria[0],
          criterion: "Financial viability",
        },
      ],
    });
    const onAdd = vi.fn();
    await act(async () =>
      root.render(
        <WorkflowStageScoringTable
          canEdit
          editor={editor}
          onAdd={onAdd}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
          stage={stage}
        />,
      ),
    );
    const selector = container.querySelector<HTMLSelectElement>(
      'select[name="taskStableKey"]',
    )!;
    await act(async () => {
      selector.value = secondTask.stableKey;
      selector.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(container.querySelector("table")?.textContent).toContain(
      "Financial viability",
    );
    expect(container.querySelector("table")?.textContent).not.toContain(
      "Business viability",
    );
    await act(async () =>
      container
        .querySelector("form")!
        .dispatchEvent(
          new Event("submit", { bubbles: true, cancelable: true }),
        ),
    );
    const saved = saveGraph.mock.calls[0][0];
    expect(saved.stages[0].scoring).toEqual(stage.scoring);
    const addButton = [...container.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Add scoring criterion"),
    )!;
    await act(async () => addButton.click());
    expect(onAdd).toHaveBeenCalledWith(secondTask.stableKey);
    await act(async () => root.unmount());
  });
});
