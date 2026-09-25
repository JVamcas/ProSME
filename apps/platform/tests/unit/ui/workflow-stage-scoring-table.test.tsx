// @vitest-environment happy-dom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorkflowStageScoringTable } from "@/modules/workflows/ui/definitions/WorkflowStageScoringTable";
import type { WorkflowEditorView } from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { referenceWorkflow } from "../../support/ReferenceWorkflowFixture";

afterEach(() => {
  document.body.replaceChildren();
});

describe("workflow stage scoring table", () => {
  it("renders scoring fields through the shared data table", async () => {
    const stage = structuredClone(referenceWorkflow.stages[0]);
    stage.scoring = {
      aggregation: "WEIGHTED_AVERAGE",
      taskStableKey: "PRE_SCREEN_CHECKLIST",
      criteria: [{
        criterion: "Business viability",
        description: "Assess viability.",
        weight: 60,
        scaleMinimum: 0,
        scaleMaximum: 10,
        mandatoryComment: true,
      }],
    };
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

    await act(async () => root.render(
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
    ));

    expect(container.textContent).toContain("Weighted average");
    expect(container.textContent).toContain("Workflow task");
    expect(container.textContent).toContain("Pre-screening checklist");
    expect(container.textContent).toContain("Business viability");
    expect(container.textContent).toContain("Assess viability.");
    expect(container.textContent).toContain("0–10");
    expect(container.textContent).not.toContain("Threshold");
    expect(container.textContent).toContain("Mandatory comment");

    await act(async () => root.unmount());
  });
});
