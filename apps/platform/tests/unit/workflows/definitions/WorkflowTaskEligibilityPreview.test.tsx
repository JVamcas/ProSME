import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { previewQuery } = vi.hoisted(() => ({
  previewQuery: vi.fn(),
}));

vi.mock("@/modules/workflows/ui/definitions/useWorkflowEligibilityForms", () => ({
  useWorkflowEligibilityForms: previewQuery,
}));

vi.mock("@/modules/forms/FormHooks", () => ({
  usePublishedFormRuntime: vi.fn(() => ({ isPending: false })),
  usePublishedForms: () => ({ data: [] }),
}));
vi.mock("@/shared/ui/DraggableDialog", () => ({
  DraggableDialog: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/modules/forms/ui/renderer/FormRenderer", () => ({
  FormRenderer: ({ definition }: { definition: { title: string } }) => definition.title,
}));

import { usePublishedFormRuntime } from "@/modules/forms/FormHooks";
import { WorkflowTaskPreviewDialog } from "@/modules/workflows/ui/definitions/WorkflowTaskPreviewDialog";
import { WorkflowTaskEligibilityPreview } from "@/modules/workflows/ui/definitions/WorkflowTaskEligibilityPreview";
import { referenceWorkflow } from "../../../support/ReferenceWorkflowFixture";

beforeEach(() => {
  vi.clearAllMocks();
  previewQuery.mockReturnValue({ data: [], isPending: false, isError: false });
});

const previewProps = {
  definitionId: "10000000-0000-4000-8000-000000000001",
  versionId: "20000000-0000-4000-8000-000000000001",
};

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
      ...previewProps,
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
    expect(previewQuery).toHaveBeenCalledWith(previewProps.definitionId, previewProps.versionId);
  });

  it("shows each attached call's inherited form", () => {
    previewQuery.mockReturnValue({ data: [
      { fundingCallId: "call-one", fundingCallTitle: "First call", formVersionId: "form-one", formName: "First eligibility" },
      { fundingCallId: "call-two", fundingCallTitle: "Second call", formVersionId: "form-two", formName: "Second eligibility" },
    ] });
    vi.mocked(usePublishedFormRuntime).mockReturnValue({
      data: { title: "Verification questions" },
      isPending: false,
    } as never);
    const markup = renderToStaticMarkup(createElement(WorkflowTaskEligibilityPreview, previewProps));
    expect(markup).toContain("First call");
    expect(markup).toContain("Second call");
    expect(markup).toContain("First eligibility");
    expect(markup).toContain("Verification questions");
    expect(markup).not.toContain("not attached");
    expect(usePublishedFormRuntime).toHaveBeenCalledWith("form-one");
    expect(usePublishedFormRuntime).toHaveBeenCalledWith("form-two");
  });

  it("distinguishes an attached call without a form from an unattached workflow", () => {
    previewQuery.mockReturnValue({ data: [
      { fundingCallId: "call-one", fundingCallTitle: "First call", formVersionId: null, formName: null },
    ] });
    const markup = renderToStaticMarkup(createElement(WorkflowTaskEligibilityPreview, previewProps));
    expect(markup).toContain("First call");
    expect(markup).toContain("no published eligibility verification form");
    expect(markup).not.toContain("not attached");
  });

  it("shows loading and lookup failures without claiming configuration is missing", () => {
    previewQuery.mockReturnValue({ isPending: true });
    expect(renderToStaticMarkup(createElement(WorkflowTaskEligibilityPreview, previewProps)))
      .toContain('role="status"');
    previewQuery.mockReturnValue({ isError: true, error: new Error("Preview unavailable") });
    const markup = renderToStaticMarkup(createElement(WorkflowTaskEligibilityPreview, previewProps));
    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Preview unavailable");
    expect(markup).not.toContain("not attached");
  });
});
