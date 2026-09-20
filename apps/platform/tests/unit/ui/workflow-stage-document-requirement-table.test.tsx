// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorkflowStageDocumentRequirementTable } from "@/modules/workflows/ui/definitions/WorkflowStageDocumentRequirementTable";
import { referenceWorkflow } from "../../support/ReferenceWorkflowFixture";

afterEach(() => {
  document.body.replaceChildren();
});

describe("workflow stage document requirement table", () => {
  it("renders all requirement fields in the shared table", async () => {
    const stage = structuredClone(referenceWorkflow.stages[0]);
    stage.documentRequirements = [{
      name: "Tax clearance certificate",
      mandatory: true,
      acceptedFileTypes: ["PDF", "JPG"],
      maximumSizeMb: 10,
      expiryDays: 180,
      uploader: "APPLICANT",
      verifier: "ASSIGNED_REVIEWER",
      templateReference: "TAX_CLEARANCE_TEMPLATE",
    }];
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => root.render(
      <WorkflowStageDocumentRequirementTable
        canEdit
        onAdd={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
        stage={stage}
      />,
    ));

    expect(container.textContent).toContain("Tax clearance certificate");
    expect(container.textContent).toContain("PDF, JPG");
    expect(container.textContent).toContain("10 MB");
    expect(container.textContent).toContain("180 days");
    expect(container.textContent).toContain("Applicant / Assigned reviewer");
    expect(container.textContent).toContain("TAX_CLEARANCE_TEMPLATE");

    await act(async () => root.unmount());
  });
});
