// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorkflowVisualGraph } from "@/modules/workflows/ui/definitions/WorkflowVisualGraph";
import { workflowGraphMetrics } from "@/modules/workflows/ui/definitions/WorkflowGraphLayout";
import { referenceWorkflow } from "../../support/ReferenceWorkflowFixture";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => document.body.replaceChildren());

async function renderGraph() {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const onSelect = vi.fn();
  await act(async () =>
    root.render(
      <WorkflowVisualGraph
        onSelect={onSelect}
        stages={referenceWorkflow.stages.slice(0, 3)}
        transitions={referenceWorkflow.transitions}
      />,
    ),
  );
  const region = container.querySelector<HTMLElement>('[role="region"]')!;
  Object.defineProperties(region, {
    clientWidth: { value: 900 },
    clientHeight: { value: 500 },
  });
  region.setPointerCapture = vi.fn();
  region.releasePointerCapture = vi.fn();
  region.hasPointerCapture = () => true;
  const canvas = container.querySelector<HTMLElement>(
    "[data-workflow-canvas]",
  )!;
  const click = async (label: string) =>
    act(async () =>
      container
        .querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!
        .click(),
    );
  const pointer = async (
    target: HTMLElement,
    type: string,
    x: number,
    y: number,
  ) =>
    act(async () => {
      target.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          button: 0,
          isPrimary: true,
          pointerId: 1,
          clientX: x,
          clientY: y,
        }),
      );
    });
  return { container, root, region, canvas, click, pointer, onSelect };
}

describe("workflow graph zoom and pan", () => {
  it("zooms the full graph around the viewport center, limits zoom, and resets", async () => {
    const { container, root, canvas, click, region } = await renderGraph();
    try {
      await click("Zoom in");
      expect(container.textContent).toContain("120%");
      expect(canvas.style.transform).toBe("translate(-90px, -50px) scale(1.2)");
      await click("Zoom out");
      expect(canvas.style.transform).toBe("translate(0px, 0px) scale(1)");
      for (let index = 0; index < 30; index++) await click("Zoom in");
      expect(
        container.querySelector<HTMLButtonElement>('[aria-label="Zoom in"]')!
          .disabled,
      ).toBe(true);
      expect(container.textContent).toContain("200%");
      for (let index = 0; index < 40; index++) await click("Zoom out");
      expect(
        container.querySelector<HTMLButtonElement>('[aria-label="Zoom out"]')!
          .disabled,
      ).toBe(true);
      expect(container.textContent).toContain("10%");
      region.scrollLeft = 100;
      region.scrollTop = 50;
      await click("Reset flow view");
      expect(canvas.style.transform).toBe("translate(0px, 0px) scale(1)");
      expect(region.scrollLeft).toBe(0);
      expect(region.scrollTop).toBe(0);
    } finally {
      await act(async () => root.unmount());
    }
  });

  it("moves the whole flow in all directions and stops on pointer cancellation", async () => {
    const { root, region, canvas, pointer } = await renderGraph();
    try {
      await pointer(canvas, "pointerdown", 100, 100);
      await pointer(region, "pointermove", 220, 170);
      expect(canvas.style.transform).toBe("translate(120px, 70px) scale(1)");
      await pointer(region, "pointermove", 30, 20);
      expect(canvas.style.transform).toBe("translate(-70px, -80px) scale(1)");
      await pointer(region, "pointercancel", 30, 20);
      await pointer(region, "pointermove", 300, 300);
      expect(canvas.style.transform).toBe("translate(-70px, -80px) scale(1)");
      expect(region.releasePointerCapture).toHaveBeenCalledWith(1);
      await act(async () =>
        region.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "ArrowRight",
            bubbles: true,
          }),
        ),
      );
      expect(canvas.style.transform).toBe("translate(-30px, -80px) scale(1)");
    } finally {
      await act(async () => root.unmount());
    }
  });

  it("fits all content inside the viewport and is stable on repeated fits", async () => {
    const { root, region, canvas, click } = await renderGraph();
    try {
      await click("Fit flow to view");
      const transform = canvas.style.transform;
      const scale = Number(transform.match(/scale\(([^)]+)\)/)![1]);
      expect(parseFloat(canvas.style.width) * scale).toBeLessThanOrEqual(
        region.clientWidth - 32,
      );
      expect(parseFloat(canvas.style.height) * scale).toBeLessThanOrEqual(
        region.clientHeight - 32,
      );
      await click("Fit flow to view");
      expect(canvas.style.transform).toBe(transform);
    } finally {
      await act(async () => root.unmount());
    }
  });

  it("drags stages in graph coordinates at reduced zoom without panning the canvas", async () => {
    const { container, root, canvas, click, pointer, onSelect } =
      await renderGraph();
    try {
      await click("Zoom out");
      const card = container.querySelector<HTMLElement>(
        "[data-workflow-stage]",
      )!;
      const button = card.querySelector("button")!;
      button.setPointerCapture = vi.fn();
      button.releasePointerCapture = vi.fn();
      vi.spyOn(card, "getBoundingClientRect").mockReturnValue({
        width: workflowGraphMetrics.nodeWidth / 1.2,
      } as DOMRect);
      const left = parseFloat(card.style.left);
      const top = parseFloat(card.style.top);
      const transform = canvas.style.transform;
      await pointer(button, "pointerdown", 100, 100);
      await pointer(button, "pointermove", 200, 150);
      await pointer(button, "pointerup", 200, 150);
      expect(parseFloat(card.style.left)).toBeCloseTo(left + 120);
      expect(parseFloat(card.style.top)).toBeCloseTo(top + 60);
      expect(canvas.style.transform).toBe(transform);
      await act(async () => button.click());
      expect(onSelect).toHaveBeenCalledWith(card.dataset.workflowStage);
    } finally {
      await act(async () => root.unmount());
    }
  });
});
