// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";

import { inspectWorkflowStageDeletion } from "@/modules/workflows/domain/definitions/WorkflowStageDeletion";
import {
  workflowStageDeletionDefaults,
  type WorkflowStageDeletionFormValues,
} from "@/modules/workflows/ui/definitions/WorkflowStageDeletionFormSchema";
import { WorkflowStageDeletionPreview } from "@/modules/workflows/ui/definitions/WorkflowStageDeletionPreview";
import { referenceWorkflow } from "../../../support/ReferenceWorkflowFixture";

(globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT: boolean;
}).IS_REACT_ACT_ENVIRONMENT = true;

async function mountPreview({ disabled = false, singleTarget = false } = {}) {
  const graph = structuredClone(referenceWorkflow);
  graph.transitions[1].targetStageKeys = ["TECHNICAL_ASSESSMENT", "FINANCE_REVIEW"];
  const inspection = inspectWorkflowStageDeletion(graph, "COMPLETENESS");
  inspection.incomingRoutes[0].singleTarget = singleTarget;
  let values: () => WorkflowStageDeletionFormValues;
  function Preview() {
    const form = useForm<WorkflowStageDeletionFormValues>({
      defaultValues: workflowStageDeletionDefaults(inspection),
    });
    values = form.getValues;
    return (
      <WorkflowStageDeletionPreview
        control={form.control}
        disabled={disabled}
        graph={graph}
        inspection={inspection}
      />
    );
  }
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(<Preview />));
  return {
    container,
    buttons: () => [...container.querySelectorAll<HTMLButtonElement>('button[aria-label^="Replacement route:"]')],
    selected: () => values().reconnections[0].targetStageKeys,
    async cleanup() {
      await act(async () => root.unmount());
      container.remove();
    },
  };
}

describe("stage deletion diagram selection", () => {
  it("toggles labels and connector strokes and stores the chosen targets in the form", async () => {
    const preview = await mountPreview();
    try {
      expect(preview.buttons()).toHaveLength(2);
      expect(preview.selected()).toEqual([]);
      await act(async () => preview.buttons()[0].click());
      expect(preview.buttons()[0].getAttribute("aria-pressed")).toBe("true");
      expect(preview.selected()).toEqual(["TECHNICAL_ASSESSMENT"]);
      await act(async () => preview.buttons()[1].click());
      expect(preview.selected()).toEqual(["TECHNICAL_ASSESSMENT", "FINANCE_REVIEW"]);
      const path = preview.container.querySelector('g[data-workflow-route^="created:"] path[stroke="transparent"]')!;
      await act(async () => path.dispatchEvent(new MouseEvent("click", { bubbles: true })));
      expect(preview.selected()).toEqual(["FINANCE_REVIEW"]);
      await act(async () => preview.buttons()[1].click());
      expect(preview.selected()).toEqual([]);
      expect(preview.container.querySelector('input[type="checkbox"]')).toBeNull();
      expect(preview.container.querySelector('g[data-workflow-route^="deleted:"] button')).toBeNull();
    } finally {
      await preview.cleanup();
    }
  });

  it("replaces the previous choice for single-destination routes", async () => {
    const preview = await mountPreview({ singleTarget: true });
    try {
      await act(async () => preview.buttons()[0].click());
      await act(async () => preview.buttons()[1].click());
      expect(preview.selected()).toEqual(["FINANCE_REVIEW"]);
      expect(preview.buttons()[0].getAttribute("aria-pressed")).toBe("false");
    } finally {
      await preview.cleanup();
    }
  });

  it("disables label and path selection while deletion is pending", async () => {
    const preview = await mountPreview({ disabled: true });
    try {
      expect(preview.buttons().every((button) => button.disabled)).toBe(true);
      await act(async () => preview.buttons()[0].click());
      expect(preview.selected()).toEqual([]);
      expect(preview.container.querySelector('path[stroke="transparent"]')).toBeNull();
    } finally {
      await preview.cleanup();
    }
  });
});
