// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorkflowStageActionTable } from "@/modules/workflows/ui/definitions/WorkflowStageActionTable";
import { referenceWorkflow } from "../../support/ReferenceWorkflowFixture";

afterEach(() => {
  document.body.replaceChildren();
});

describe("workflow stage action table", () => {
  it("shows each action’s assigned task names and marks unassigned actions", async () => {
    const stage = structuredClone(referenceWorkflow.stages[0]);
    stage.tasks.push({
      ...stage.tasks[0],
      stableKey: "SECOND_REVIEW",
      name: "Second review",
    });
    stage.actions.push({
      ...stage.actions[0],
      stableKey: "UNASSIGNED",
      label: "Unassigned decision",
      displayOrder: 2,
    });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkflowStageActionTable
          canEdit
          onAdd={vi.fn()}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
          stage={stage}
        />,
      );
    });

    expect(container.querySelector("thead")?.textContent).toContain("Task");
    const rows = container.querySelectorAll("tbody tr");
    expect(rows[0]?.textContent).toContain("Pre-screening checklist");
    expect(rows[0]?.textContent).toContain("Second review");
    expect(rows[1]?.textContent).toContain("Unassigned");

    await act(async () => root.unmount());
  });
});
