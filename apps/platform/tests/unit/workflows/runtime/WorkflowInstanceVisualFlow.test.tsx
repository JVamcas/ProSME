// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { WorkflowProgressPanel } from "@/modules/workflows/ui/WorkflowProgressPanel";
import { workflowProgressFixture as progress } from "../../../support/WorkflowProgressFixture";

afterEach(() => document.body.replaceChildren());

function findButton(container: HTMLElement, label: string) {
  const button = [...container.querySelectorAll("button")].find(
    (candidate) => candidate.textContent?.trim() === label,
  );
  expect(button).toBeDefined();
  return button!;
}

describe("workflow instance visual flow controls", () => {
  it("starts collapsed and toggles the graph while retaining the selected stage and its task details", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () =>
      root.render(<WorkflowProgressPanel progress={progress} />),
    );

    const toggle = findButton(container, "Show visual flow");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(container.textContent).toContain("2 stages");
    expect(container.textContent).toContain(
      "Inspect the workflow sequence and its routed paths.",
    );

    expect(toggle.textContent).toContain("Show visual flow");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(
      container.querySelector('[aria-label="Workflow instance visual flow"]'),
    ).toBeNull();
    expect(
      container.querySelector('[aria-label="Selected stage details"]')
        ?.textContent,
    ).toContain("Review proposal");

    await act(async () => toggle.click());
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(
      container.querySelector('[data-workflow-stage="technical"]')?.classList,
    ).toContain("border-brand-blue");
    expect(
      container.querySelector('g[data-route-taken="true"]'),
    ).not.toBeNull();

    await act(async () => toggle.click());
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(
      container.querySelector('[aria-label="Workflow instance visual flow"]'),
    ).toBeNull();
    expect(
      container.querySelector('[aria-label="Selected stage details"]')
        ?.textContent,
    ).toContain("Review proposal");
    await act(async () => root.unmount());
  });

  it("auto arranges dragged stages and expands a collapsed graph", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () =>
      root.render(<WorkflowProgressPanel progress={progress} />),
    );

    await act(async () => findButton(container, "Show visual flow").click());

    const card = container.querySelector<HTMLElement>(
      '[data-workflow-stage="technical"]',
    )!;
    const initialPosition = card.style.cssText;
    const stageButton = card.querySelector("button")!;
    stageButton.setPointerCapture = () => {};
    stageButton.releasePointerCapture = () => {};
    await act(async () => {
      stageButton.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          clientX: 100,
          clientY: 100,
          pointerId: 1,
        }),
      );
      stageButton.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          clientX: 250,
          clientY: 200,
          pointerId: 1,
        }),
      );
      stageButton.dispatchEvent(
        new PointerEvent("pointerup", {
          bubbles: true,
          pointerId: 1,
        }),
      );
    });
    expect(card.style.cssText).not.toBe(initialPosition);

    await act(async () => findButton(container, "Auto arrange").click());
    const arranged = container.querySelector<HTMLElement>(
      '[data-workflow-stage="technical"]',
    )!;
    expect(arranged.style.cssText).toBe(initialPosition);
    expect(arranged.classList).toContain("border-brand-blue");
    expect(
      container.querySelector('g[data-route-taken="true"]'),
    ).not.toBeNull();

    await act(async () => findButton(container, "Hide visual flow").click());
    await act(async () => findButton(container, "Auto arrange").click());
    expect(
      findButton(container, "Hide visual flow").getAttribute("aria-expanded"),
    ).toBe("true");
    expect(
      container.querySelector('[aria-label="Workflow instance visual flow"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[aria-label="Selected stage details"]')
        ?.textContent,
    ).toContain("Review proposal");
    await act(async () => root.unmount());
  });

  it("counts definition stages once even when the instance has repeated runs", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () =>
      root.render(
        <WorkflowProgressPanel
          progress={{
            ...progress,
            stages: [
              ...progress.stages,
              { ...progress.stages[0], id: "repeated", iterationNumber: 2 },
            ],
          }}
        />,
      ),
    );
    expect(container.textContent).toContain("2 stages");
    expect(
      container.querySelectorAll('[aria-label="Workflow stages"] li'),
    ).toHaveLength(3);
    await act(async () => root.unmount());
  });

  it("omits graph controls when no graph is available", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () =>
      root.render(
        <WorkflowProgressPanel progress={{ ...progress, graph: null }} />,
      ),
    );
    expect(container.textContent).not.toContain("Auto arrange");
    expect(
      container.querySelector('[aria-label="Selected stage details"]')
        ?.textContent,
    ).toContain("Technical Assessment");
    await act(async () => root.unmount());
  });
});
