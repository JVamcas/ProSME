// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  WorkflowTaskActions,
} from "@/modules/work-queue/ui/WorkflowTaskActions";

const requiredInput = {
  comment: { maxLength: 4_000, required: false },
  confirmation: { message: null, required: false },
  dueDate: { deadlineDays: null, required: false },
  editableFieldPaths: [],
  reasonCode: { options: [], required: false },
  reasonOrCommentRequired: false,
  reviewDate: { required: false },
  target: { type: null, value: null },
} as const;

(
  globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT: boolean;
  }
).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  document.body.replaceChildren();
});

async function renderActions(
  actions: Parameters<typeof WorkflowTaskActions>[0]["actions"],
) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <WorkflowTaskActions
        actions={actions}
        disabled={false}
        onSelect={vi.fn()}
      />,
    );
  });
  await act(async () => {
    container.querySelector<HTMLButtonElement>("button")?.click();
  });
  return { container, root };
}

describe("workflow task actions", () => {
  it("presents the configured action labels in one dropdown", async () => {
    const { container, root } = await renderActions([
          {
            actionType: "APPROVE_ADVANCE",
            available: true,
            key: "RECOMMEND",
            label: "Recommend",
            presentation: { displayOrder: 1, variant: "success" },
            requiredInput,
            runtimeVersion: 4,
            unavailableReason: null,
          },
          {
            actionType: "REQUEST_INFORMATION",
            available: true,
            key: "REQUEST_CLARIFICATION",
            label: "Request clarification",
            presentation: { displayOrder: 2, variant: "outlineOrange" },
            requiredInput,
            runtimeVersion: 4,
            unavailableReason: null,
          },
        ]);

    expect(container.textContent).toContain("Actions");
    expect(document.body.textContent?.indexOf("Recommend")).toBeLessThan(
      document.body.textContent?.indexOf("Request clarification") ?? -1,
    );
    expect(container.querySelectorAll('button[type="button"]')).toHaveLength(1);
    expect(document.querySelectorAll('[role="menuitem"]')).toHaveLength(2);

    await act(async () => root.unmount());
  });

  it("does not invent a fallback action", () => {
    const markup = renderToStaticMarkup(
      <WorkflowTaskActions
        actions={[]}
        disabled={false}
        onSelect={vi.fn()}
      />,
    );

    expect(markup).toContain("No workflow actions are configured for this task.");
    expect(markup).not.toContain("type=\"submit\"");
  });

  it("disables unavailable actions and presents the safe reason", async () => {
    const { root } = await renderActions([{
          actionType: "REJECT",
          available: false,
          key: "REJECT",
          label: "Reject",
          presentation: { displayOrder: 1, variant: "danger" },
          requiredInput,
          runtimeVersion: 4,
          unavailableReason: "Requirements are not currently met.",
        }]);

    const item = document.querySelector<HTMLElement>('[role="menuitem"]');
    expect(item?.getAttribute("aria-disabled")).toBe("true");
    expect(item?.textContent).toContain("Requirements are not currently met.");

    await act(async () => root.unmount());
  });
});
