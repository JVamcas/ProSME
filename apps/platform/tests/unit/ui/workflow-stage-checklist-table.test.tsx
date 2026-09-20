// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorkflowStageChecklistTable } from "@/modules/workflows/ui/definitions/WorkflowStageChecklistTable";
import { referenceWorkflow } from "../../support/ReferenceWorkflowFixture";

afterEach(() => {
  document.body.replaceChildren();
});

describe("workflow stage checklist table", () => {
  it("renders the seven checklist configuration fields in the shared table", async () => {
    const stage = structuredClone(referenceWorkflow.stages[0]);
    stage.checklistItems = [{
      key: "OWNERSHIP_CONFIRMED",
      text: "Confirm ownership.",
      mandatory: true,
      responseType: "YES_NO",
      evidenceRequirement: "REQUIRED",
      notes: "Review current records.",
      displayOrder: 1,
    }];
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => root.render(
      <WorkflowStageChecklistTable
        canEdit
        onAdd={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        stage={stage}
      />,
    ));

    expect(container.textContent).toContain("OWNERSHIP_CONFIRMED");
    expect(container.textContent).toContain("Confirm ownership.");
    expect(container.textContent).toContain("Yes / no");
    expect(container.textContent).toContain("Required evidence");
    expect(container.textContent).toContain("Review current records.");
    expect(container.textContent).toContain("Mandatory");
    expect(container.textContent).toContain("Order");

    await act(async () => root.unmount());
  });
});
