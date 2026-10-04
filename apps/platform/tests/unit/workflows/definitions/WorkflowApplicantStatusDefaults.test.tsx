// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { FormProvider } from "react-hook-form";
import { afterEach, describe, expect, it, vi } from "vitest";

import { workflowPublicStatuses } from "@/modules/workflows/domain/definitions/WorkflowStageDefinition";
import type { WorkflowEditorView } from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { workflowApplicantStatusDefaults } from "@/modules/workflows/domain/definitions/WorkflowApplicantStatusDefaults";
import { workflowStageFormSchema } from "@/modules/workflows/ui/definitions/WorkflowStageFormSchema";
import { WorkflowStageDetailsStep } from "@/modules/workflows/ui/definitions/WorkflowStageDetailsStep";
import { useWorkflowStageDialogController } from "@/modules/workflows/ui/definitions/WorkflowStageDialogController";
import { referenceWorkflow } from "../../../support/ReferenceWorkflowFixture";

const { mutateAsync } = vi.hoisted(() => ({ mutateAsync: vi.fn() }));

vi.mock("@/modules/forms/FormHooks", () => ({
  usePublishedForms: () => ({ data: [], isPending: false }),
}));
vi.mock("@/modules/workflows/WorkflowHooks", () => ({
  useSaveWorkflowGraph: () => ({ mutateAsync }),
}));
vi.mock(
  "@/modules/workflows/ui/definitions/useWorkflowConditionFields",
  () => ({
    useWorkflowConditionFields: () => ({
      completionFields: [],
      entryFields: [],
      isPending: false,
    }),
  }),
);

(
  globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT: boolean;
  }
).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  vi.clearAllMocks();
  document.body.replaceChildren();
});

async function mountStage(editing = false) {
  const graph = structuredClone(referenceWorkflow);
  const stage = graph.stages[0];
  const editor = {
    definition: { id: "template" },
    version: { id: "draft", status: "DRAFT", rowVersion: 1 },
    graph,
  } as WorkflowEditorView;
  let controller!: ReturnType<typeof useWorkflowStageDialogController>;

  function Harness({ showDetails }: { showDetails: boolean }) {
    controller = useWorkflowStageDialogController(
      editor,
      editing ? stage : undefined,
    );
    return (
      <FormProvider {...controller.form}>
        {showDetails ? <WorkflowStageDetailsStep /> : null}
      </FormProvider>
    );
  }

  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(<Harness showDetails />));

  return {
    container,
    controller,
    stage,
    async showDetails(visible: boolean) {
      await act(async () => root.render(<Harness showDetails={visible} />));
    },
    async unmount() {
      await act(async () => root.unmount());
    },
    async selectStatus(status: string) {
      const select = container.querySelector("select")!;
      await act(async () => {
        select.value = status;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });
    },
  };
}

describe("workflow applicant status suggestions", () => {
  it("starts new stages with the default review wording", async () => {
    const view = await mountStage();
    try {
      expect(view.controller.form.getValues("publicStatusMapping")).toEqual({
        status: "UNDER_REVIEW",
        label: "Under review",
        description: "Your application is being reviewed.",
      });
    } finally {
      await view.unmount();
    }
  });

  it("fills valid editable suggestions for every status selection", async () => {
    const view = await mountStage();
    try {
      await act(async () =>
        view.controller.form.setValue("name", "Review stage"),
      );
      for (const status of workflowPublicStatuses) {
        await view.selectStatus(status);
        expect(view.controller.form.getValues("publicStatusMapping")).toEqual({
          status,
          ...workflowApplicantStatusDefaults[status],
        });
        expect(
          view.container.querySelector<HTMLInputElement>(
            '[name="publicStatusMapping.label"]',
          )?.value,
        ).toBe(workflowApplicantStatusDefaults[status].label);
        expect(
          view.container.querySelector<HTMLTextAreaElement>(
            '[name="publicStatusMapping.description"]',
          )?.value,
        ).toBe(workflowApplicantStatusDefaults[status].description);
        await act(async () => {
          expect(await view.controller.validateStep("details")).toBe(true);
        });
      }
      expect(
        view.controller.form.getFieldState("publicStatusMapping.label").isDirty,
      ).toBe(true);
    } finally {
      await view.unmount();
    }
  }, 30_000);

  it("keeps existing custom wording when opening and revisiting details", async () => {
    const view = await mountStage(true);
    try {
      expect(view.controller.form.getValues("publicStatusMapping")).toEqual(
        view.stage.publicStatusMapping,
      );
      await view.showDetails(false);
      await view.showDetails(true);
      expect(view.controller.form.getValues("publicStatusMapping")).toEqual(
        view.stage.publicStatusMapping,
      );
      expect(mutateAsync).not.toHaveBeenCalled();
    } finally {
      await view.unmount();
    }
  });

  it("saves edited suggestions and keeps them when returning to details", async () => {
    const view = await mountStage(true);
    const customMapping = {
      status: "SUBMITTED" as const,
      label: "Decision pending release",
      description: "A decision is being finalized before release.",
    };
    try {
      await view.selectStatus("SUBMITTED");
      const label = view.container.querySelector<HTMLInputElement>(
        '[name="publicStatusMapping.label"]',
      )!;
      const description = view.container.querySelector<HTMLTextAreaElement>(
        '[name="publicStatusMapping.description"]',
      )!;
      expect(label.readOnly || label.disabled).toBe(false);
      expect(description.readOnly || description.disabled).toBe(false);
      await act(async () => {
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )!.set!.call(label, customMapping.label);
        label.dispatchEvent(new Event("input", { bubbles: true }));
        Object.getOwnPropertyDescriptor(
          HTMLTextAreaElement.prototype,
          "value",
        )!.set!.call(description, customMapping.description);
        description.dispatchEvent(new Event("input", { bubbles: true }));
      });
      expect(view.controller.form.getValues("publicStatusMapping")).toEqual(
        customMapping,
      );
      await view.showDetails(false);
      await view.showDetails(true);
      expect(view.controller.form.getValues("publicStatusMapping")).toEqual(
        customMapping,
      );
      await act(async () => {
        await view.controller.save(
          workflowStageFormSchema.parse(view.controller.form.getValues()),
        );
      });
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          stages: expect.arrayContaining([
            expect.objectContaining({
              stableKey: view.stage.stableKey,
              publicStatusMapping: customMapping,
            }),
          ]),
        }),
      );
      await view.selectStatus("CLOSED");
      expect(view.controller.form.getValues("publicStatusMapping")).toEqual({
        status: "CLOSED",
        ...workflowApplicantStatusDefaults.CLOSED,
      });
    } finally {
      await view.unmount();
    }
  });
});
