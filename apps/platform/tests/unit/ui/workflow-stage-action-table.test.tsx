// @vitest-environment happy-dom

import { act } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorkflowStageActionTable } from "@/modules/workflows/ui/definitions/WorkflowStageActionTable";
import { referenceWorkflow } from "../../support/ReferenceWorkflowFixture";
import { actionNotificationsEditor } from "../../support/WorkflowActionNotificationsFixture";

(
  globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT: boolean;
  }
).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  document.body.replaceChildren();
});

describe("workflow stage action table", () => {
  it("shows each action’s assigned task names and marks unassigned actions", async () => {
    const stage = structuredClone(referenceWorkflow.stages[0]);
    stage.tasks.push({
      ...stage.tasks[0],
      stableKey: "SECOND_REVIEW",
      name: "Second review",
    });
    stage.actions.push({
      ...stage.actions[0],
      stableKey: "UNASSIGNED",
      label: "Unassigned decision",
      displayOrder: 2,
    });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <WorkflowStageActionTable
          canEdit
          editor={actionNotificationsEditor()}
          onAdd={vi.fn()}
          onDelete={vi.fn()}
          onEdit={vi.fn()}
          stage={stage}
        />,
      );
    });

    expect(container.querySelector("thead")?.textContent).toContain("Task");
    expect(container.querySelector("thead")?.textContent).toContain(
      "Destination",
    );
    const rows = container.querySelectorAll("tbody tr");
    expect(rows[0]?.textContent).toContain("Pre-screening checklist");
    expect(rows[0]?.textContent).toContain("Second review");
    expect(rows[0]?.textContent).toContain("Completeness screening");
    expect(rows[1]?.textContent).toContain("Unassigned");
    expect(rows[1]?.textContent).toContain("--");

    await act(async () => root.unmount());
  });

  it.each([true, false])(
    "opens notification drawers from the count and action menu with edit access %s",
    async (canEdit) => {
      const editor = actionNotificationsEditor();
      const stage = editor.graph.stages[0];
      const container = document.createElement("div");
      document.body.append(container);
      const root = createRoot(container);
      const client = new QueryClient();
      try {
        await act(async () =>
          root.render(
            <QueryClientProvider client={client}>
              <WorkflowStageActionTable
                canEdit={canEdit}
                editor={editor}
                stage={stage}
                onAdd={vi.fn()}
                onEdit={vi.fn()}
                onDelete={vi.fn()}
              />
            </QueryClientProvider>,
          ),
        );
        expect(container.querySelector("thead")?.textContent).toContain(
          "Notifications",
        );
        expect(
          container.querySelectorAll("tbody tr")[0]?.textContent,
        ).toContain("View (1)");
        expect(
          container.querySelectorAll("tbody tr")[1]?.textContent,
        ).toContain("None");
        const view = container.querySelector<HTMLButtonElement>(
          `[aria-label="View notifications for ${stage.actions[0].label}"]`,
        )!;
        await act(async () => view.click());
        expect(
          document.querySelector('[role="dialog"]')?.textContent,
        ).toContain("Decision for {{fundingcalltitle}}");
        const close = [
          ...document.querySelectorAll<HTMLButtonElement>(
            '[role="dialog"] button',
          ),
        ].find((button) => button.textContent === "Close")!;
        await act(async () => close.click());
        await act(async () =>
          container
            .querySelector<HTMLButtonElement>(
              '[aria-label="Actions for No notification action"]',
            )!
            .click(),
        );
        const menuItem = [
          ...document.querySelectorAll<HTMLElement>('[role="menuitem"]'),
        ].find((item) => item.textContent === "Notifications")!;
        expect(menuItem.getAttribute("aria-disabled")).not.toBe("true");
        await act(async () => menuItem.click());
        const drawer = document.querySelector('[role="dialog"]')!;
        expect(drawer.textContent).toContain("No notifications configured");
        expect(drawer.textContent?.includes("Add notification")).toBe(canEdit);
      } finally {
        await act(async () => root.unmount());
        client.clear();
      }
    },
  );
});
