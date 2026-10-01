import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/forms/FormHooks", () => ({
  usePublishedFormRuntime: vi.fn(() => ({ isPending: false })),
  usePublishedForms: () => ({ data: [] }),
}));
vi.mock("@/components/ui/draggable-dialog", () => ({
  DraggableDialog: ({ children }: { children: React.ReactNode }) => children,
}));

import { usePublishedFormRuntime } from "@/modules/forms/FormHooks";
import { WorkflowTaskPreviewDialog } from "@/modules/workflows/ui/definitions/WorkflowTaskPreviewDialog";
import { referenceWorkflow } from "../../../support/ReferenceWorkflowFixture";

describe("inherited eligibility form preview", () => {
  it.each([
    { formPurpose: "ELIGIBILITY_VERIFICATION" },
    { command: "AUTHORITATIVE_ELIGIBILITY" },
  ])("counts the inherited form and explains the funding call context: %j", (config) => {
    const stage = structuredClone(referenceWorkflow.stages[0]);
    stage.checklistItems = [];
    stage.documentRequirements = [];
    stage.commentFields = [];
    stage.scoring = null;
    const task = { ...stage.tasks[0], config, formBinding: null };
    const markup = renderToStaticMarkup(createElement(WorkflowTaskPreviewDialog, {
      onClose: () => undefined,
      stage,
      task,
    }));
    expect(markup).toContain("1 configured section");
    expect(markup).toContain("Eligibility verification");
    expect(markup).toContain("From funding call");
    expect(markup).toContain("eligibility ruleset");
    expect(markup).not.toContain("No reviewer work sections");
    expect(markup).not.toContain("<select");
    expect(usePublishedFormRuntime).toHaveBeenCalledWith(null);
  });
});
