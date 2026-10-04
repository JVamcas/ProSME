// @vitest-environment happy-dom

import { act, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { FormProvider } from "react-hook-form";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { WorkflowEditorView } from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { WorkflowStageDetailsStep } from "@/modules/workflows/ui/definitions/WorkflowStageDetailsStep";
import { useWorkflowStageDialogController } from "@/modules/workflows/ui/definitions/WorkflowStageDialogController";
import { WorkflowStageReviewStep } from "@/modules/workflows/ui/definitions/WorkflowStageReviewStep";
import { workflowStageFormSchema } from "@/modules/workflows/ui/definitions/WorkflowStageFormSchema";
import { referenceWorkflow } from "../../support/ReferenceWorkflowFixture";

const { saveGraph } = vi.hoisted(() => ({ saveGraph: vi.fn() }));

vi.mock("@/modules/workflows/WorkflowHooks", () => ({
  useSaveWorkflowGraph: () => ({ mutateAsync: saveGraph }),
}));
vi.mock("@/modules/forms/FormHooks", () => ({
  usePublishedForms: () => ({ data: [], isPending: false }),
}));
vi.mock("@/modules/workflows/ui/definitions/useWorkflowConditionFields", () => ({
  useWorkflowConditionFields: () => ({}),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;

let controller: ReturnType<typeof useWorkflowStageDialogController>;
const editor: WorkflowEditorView = {
  allowedActions: [],
  definition: { id: "workflow", code: "TEST", name: "Test", description: "" },
  version: {
    id: "version",
    number: 1,
    status: "DRAFT",
    createdAt: "2026-10-03T00:00:00Z",
    publishedAt: null,
    retiredAt: null,
    rowVersion: 1,
  },
  graph: referenceWorkflow,
  validation: { valid: true, errors: [], warnings: [] },
};

function StageFields({ existing = true }: { existing?: boolean }) {
  const currentController = useWorkflowStageDialogController(
    editor,
    existing ? referenceWorkflow.stages[0] : undefined,
  );
  useEffect(() => {
    controller = currentController;
  }, [currentController]);
  return (
    <FormProvider {...currentController.form}>
      <WorkflowStageDetailsStep />
      <WorkflowStageReviewStep coiFormItems={[]} stages={editor.graph.stages} />
    </FormProvider>
  );
}

afterEach(() => {
  document.body.replaceChildren();
  vi.clearAllMocks();
});

describe("workflow stage applicant-facing status", () => {
  it("loads existing mappings and saves changes without replacing stage configuration", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => root.render(<StageFields />));

    const stage = referenceWorkflow.stages[0];
    expect(container.querySelector<HTMLInputElement>(
      'input[name="publicStatusMapping.label"]',
    )?.value).toBe(stage.publicStatusMapping.label);
    expect(container.textContent).toContain("Applicant status description");
    const mapping = {
      status: "UNDER_REVIEW" as const,
      label: "Screening in progress",
      description: "Your application is undergoing screening.",
    };
    await act(async () => {
      controller.form.setValue("publicStatusMapping", mapping);
    });
    expect(container.textContent).toContain(mapping.label);
    await act(async () => {
      expect(await controller.validateStep("details")).toBe(true);
      await controller.save(workflowStageFormSchema.parse(controller.form.getValues()));
    });
    const graph = saveGraph.mock.calls[0][0];
    expect(graph.stages[0]).toEqual({ ...stage, publicStatusMapping: mapping });
    expect(graph.stages.slice(1)).toEqual(referenceWorkflow.stages.slice(1));
    expect(graph.transitions).toEqual(referenceWorkflow.transitions);
    await act(async () => root.unmount());
  });

  it("defaults new stages and blocks continuing with invalid public status fields", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => root.render(<StageFields existing={false} />));
    expect(controller.form.getValues("publicStatusMapping")).toEqual({
      status: "UNDER_REVIEW",
      label: "Under review",
      description: "Your application is being reviewed.",
    });
    await act(async () => {
      controller.form.setValue("name", "New screening stage");
      controller.form.setValue("publicStatusMapping.label", " ");
      controller.form.setValue("publicStatusMapping.description", "x".repeat(301));
      expect(await controller.validateStep("details")).toBe(false);
    });
    expect(controller.form.getFieldState("publicStatusMapping.label").error).toBeDefined();
    expect(controller.form.getFieldState("publicStatusMapping.description").error).toBeDefined();
    expect(saveGraph).not.toHaveBeenCalled();
    await act(async () => {
      controller.form.setValue("publicStatusMapping.label", "Application received");
      controller.form.setValue("publicStatusMapping.description", "We received your application.");
      controller.form.setValue("publicStatusMapping.status", "SUBMITTED");
      expect(await controller.validateStep("details")).toBe(true);
      await controller.save(workflowStageFormSchema.parse(controller.form.getValues()));
    });
    expect(saveGraph.mock.calls[0][0].stages.at(-1).publicStatusMapping.status).toBe("SUBMITTED");
    await act(async () => root.unmount());
  });
});
