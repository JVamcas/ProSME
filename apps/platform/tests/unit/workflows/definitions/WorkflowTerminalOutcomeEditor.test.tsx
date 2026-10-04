// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";

import type { WorkflowEditorView } from "@/modules/workflows/domain/definitions/WorkflowTypes";
import { terminalOutcomeApplicantStatus } from "@/modules/workflows/domain/transitions/WorkflowTerminalOutcome";
import { WorkflowActionRouteEditor } from "@/modules/workflows/ui/definitions/WorkflowActionRouteEditor";
import { referenceWorkflow } from "../../../support/ReferenceWorkflowFixture";

vi.mock(
  "@/modules/workflows/ui/definitions/useWorkflowConditionFields",
  () => ({
    useWorkflowConditionFields: () => ({
      completionFields: [],
      isPending: false,
    }),
  }),
);
vi.mock("@/modules/workflows/ui/definitions/WorkflowConditionEditor", () => ({
  WorkflowConditionEditor: () => null,
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

it("auto-populates changes, saves edits and preserves them on reopening", async () => {
  const editor = {
    graph: structuredClone(referenceWorkflow),
  } as WorkflowEditorView;
  const onSave = vi.fn();
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const render = (
    route: Parameters<typeof WorkflowActionRouteEditor>[0]["route"],
  ) => (
    <WorkflowActionRouteEditor
      actionType="REJECT"
      actionKey="DECIDE"
      editor={editor}
      onCancel={vi.fn()}
      onSave={onSave}
      priority={1}
      priorityInUse={() => false}
      route={route}
      stage={editor.graph.stages[0]}
    />
  );
  try {
    await act(async () =>
      root.render(
        render({
          actionKey: "DECIDE",
          sourceStageKey: editor.graph.stages[0].stableKey,
          targetStageKeys: [],
          terminalOutcome: "CLOSED",
          priority: 1,
          condition: null,
        }),
      ),
    );
    expect(
      container.querySelector('[name="rejectionPublicStatus"]'),
    ).toBeNull();
    const select = container.querySelector<HTMLSelectElement>(
      '[name="terminalOutcome"]',
    )!;
    const label = container.querySelector<HTMLInputElement>(
      '[name="terminalApplicantLabel"]',
    )!;
    const description = container.querySelector<HTMLTextAreaElement>(
      '[name="terminalApplicantDescription"]',
    )!;
    await act(async () => {
      select.value = "RECOVERY";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(label.value).toBe(terminalOutcomeApplicantStatus("RECOVERY").label);
    expect(description.value).toBe(
      terminalOutcomeApplicantStatus("RECOVERY").description,
    );
    expect(label.readOnly || description.readOnly).toBe(false);
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!.call(label, "Recovery decision");
      label.dispatchEvent(new Event("input", { bubbles: true }));
      Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )!.set!.call(description, "Please review the recovery decision.");
      description.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const button = [...container.querySelectorAll("button")].find(
      (item) => item.textContent === "Save route",
    )!;
    await act(async () => button.click());
    const saved = onSave.mock.calls[0][0];
    expect(saved.terminalApplicantStatus).toEqual({
      label: "Recovery decision",
      description: "Please review the recovery decision.",
    });
    await act(async () => root.render(null));
    await act(async () => root.render(render(saved)));
    expect(
      container.querySelector<HTMLInputElement>(
        '[name="terminalApplicantLabel"]',
      )!.value,
    ).toBe("Recovery decision");
    expect(
      container.querySelector<HTMLTextAreaElement>(
        '[name="terminalApplicantDescription"]',
      )!.value,
    ).toBe("Please review the recovery decision.");
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

it("offers only the immediate predecessor for Return and saves one stage", async () => {
  const editor = {
    graph: structuredClone(referenceWorkflow),
  } as WorkflowEditorView;
  const stage = editor.graph.stages.find(
    (item) => item.stableKey === "COMMITTEE_DECISION",
  )!;
  const onSave = vi.fn();
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () =>
      root.render(
        <WorkflowActionRouteEditor
          actionType="RETURN"
          actionKey="RETURN_REVIEW"
          editor={editor}
          stage={stage}
          onSave={onSave}
          onCancel={vi.fn()}
          priority={1}
          priorityInUse={() => false}
        />,
      ),
    );
    const destinations = container.querySelector<HTMLSelectElement>(
      '[name="targetStageKeys"]',
    )!;
    expect(
      [...destinations.options].map((option) => option.value).filter(Boolean),
    ).toEqual(["FINANCE_REVIEW"]);
    expect(destinations.multiple).toBe(false);
    expect(destinations.value).toBe("FINANCE_REVIEW");
    const types = container.querySelector<HTMLSelectElement>(
      '[name="targetType"]',
    )!;
    expect(
      [...types.options].map((option) => option.value).filter(Boolean),
    ).toEqual(["STAGE"]);
    const save = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Save route",
    )!;
    await act(async () => save.click());
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ targetStageKeys: ["FINANCE_REVIEW"] }),
    );
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});
