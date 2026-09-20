// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorkflowStageCommentFieldTable } from "@/modules/workflows/ui/definitions/WorkflowStageCommentFieldTable";
import { referenceWorkflow } from "../../support/ReferenceWorkflowFixture";

afterEach(() => {
  document.body.replaceChildren();
});

describe("workflow stage comments and recommendations table", () => {
  it("renders configured fields through the shared data table", async () => {
    const stage = structuredClone(referenceWorkflow.stages[0]);
    stage.commentFields = [{
      key: "REVIEW_RECOMMENDATION",
      label: "Review recommendation",
      helpText: "Summarise the recommendation.",
      mandatory: true,
      visibility: "INTERNAL_ONLY",
      displayOrder: 1,
    }];
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => root.render(
      <WorkflowStageCommentFieldTable
        canEdit
        onAdd={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        stage={stage}
      />,
    ));

    expect(container.textContent).toContain("Review recommendation");
    expect(container.textContent).toContain("Summarise the recommendation.");
    expect(container.textContent).toContain("Internal only");
    expect(container.textContent).toContain("Mandatory");

    await act(async () => root.unmount());
  });
});
