// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkflowActionNotificationsDrawer } from "@/modules/workflows/ui/definitions/WorkflowActionNotificationsDrawer";
import { clientWorkflowService } from "@/modules/workflows/ClientWorkflowService";
import { actionNotificationsEditor } from "../../../support/WorkflowActionNotificationsFixture";

vi.mock("@/shared/ui/FormRichTextField", async () => {
  const { useFormContext } = await import("react-hook-form");
  return {
    FormRichTextField: ({ name, label }: { name: string; label: string }) => {
      const form = useFormContext();
      return (
        <label>
          {label}
          <textarea {...form.register(name)} />
        </label>
      );
    },
  };
});
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => vi.restoreAllMocks());

async function click(text: string) {
  const element = [
    ...document.querySelectorAll<HTMLElement>('button, [role="menuitem"]'),
  ].find(
    (item) =>
      item.textContent?.trim() === text ||
      item.getAttribute("aria-label") === text,
  );
  expect(element).toBeDefined();
  await act(async () => {
    element!.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}
async function fill(name: string, value: string) {
  const element = document.querySelector<
    HTMLInputElement | HTMLTextAreaElement
  >(`[name="${name}"]`)!;
  const prototype =
    element.tagName === "TEXTAREA"
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(
      element,
      value,
    );
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

async function mount(canEdit = true, empty = false) {
  const editor = actionNotificationsEditor();
  const stage = editor.graph.stages[0];
  const action = stage.actions[0];
  if (empty) action.notifications = [];
  const save = vi
    .spyOn(clientWorkflowService, "saveAction")
    .mockResolvedValue(editor);
  const close = vi.fn();
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const render = (value = editor) => (
    <QueryClientProvider client={client}>
      <WorkflowActionNotificationsDrawer
        editor={value}
        action={action}
        stage={stage}
        canEdit={canEdit}
        onClose={close}
      />
    </QueryClientProvider>
  );
  await act(async () => root.render(render()));
  return {
    editor,
    stage,
    action,
    save,
    close,
    rerender: async () => {
      await act(async () =>
        root.render(
          render({ ...editor, version: { ...editor.version, rowVersion: 99 } }),
        ),
      );
    },
    cleanup: async () => {
      await act(async () => root.unmount());
      container.remove();
      client.clear();
    },
  };
}

describe("action notifications right drawer", () => {
  it("adds and edits notifications inside one drawer, then saves without changing action configuration, routes or bindings", async () => {
    const view = await mount(true, true);
    try {
      await click("Add notification");
      expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
      expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
        "Without a condition",
      );
      await fill("subject", "Decision ");
      await click("Insert subject parameter");
      await click("Funding call title");
      expect(
        document.querySelector<HTMLInputElement>('[name="subject"]')?.value,
      ).toContain("{{fundingcalltitle}}");
      await fill("body", "<p>Hello {{recipientname}}</p>");
      await click("Save notification");
      expect(view.save).not.toHaveBeenCalled();
      expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
        "Always send",
      );
      await click("Actions for Decision {{fundingcalltitle}}");
      await click("Edit");
      await fill("subject", "Updated decision");
      await click("Save notification");
      await click("Save notifications");
      expect(view.save).toHaveBeenCalledOnce();
      const input = view.save.mock.calls[0][1];
      expect(input.action).toEqual({
        ...view.action,
        notifications: [
          {
            id: expect.any(String),
            condition: null,
            recipientType: "APPLICATION_OWNER",
            recipientId: null,
            subject: "Updated decision",
            body: "<p>Hello {{recipientname}}</p>",
          },
        ],
      });
      expect(input.routes).toEqual(
        view.editor.graph.transitions.filter(
          (route) =>
            route.sourceStageKey === view.stage.stableKey &&
            route.actionKey === view.action.stableKey,
        ),
      );
      expect(input.taskStableKeys).toEqual(
        view.stage.tasks
          .filter((task) => task.actionKeys.includes(view.action.stableKey))
          .map((task) => task.stableKey),
      );
      expect(input.expectedRowVersion).toBe(3);
      expect(view.close).toHaveBeenCalledOnce();
    } finally {
      await view.cleanup();
    }
  });

  it("persists removal of the last notification", async () => {
    const view = await mount();
    try {
      await click("Actions for Decision for {{fundingcalltitle}}");
      await click("Delete");
      expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
        "No notifications configured",
      );
      await click("Save notifications");
      expect(view.save.mock.calls[0][1].action.notifications).toEqual([]);
    } finally {
      await view.cleanup();
    }
  });

  it("discards unsaved edits on close and does not save a cancelled add form", async () => {
    const view = await mount();
    try {
      await click("Add notification");
      await fill("subject", "Unsaved");
      await click("Cancel");
      expect(
        document.querySelector('[role="dialog"]')?.textContent,
      ).not.toContain("Unsaved");
      await click("Close");
      expect(view.save).not.toHaveBeenCalled();
      expect(view.close).toHaveBeenCalledOnce();
    } finally {
      await view.cleanup();
    }
  });

  it("keeps failed edits and the opening version for conflict checks", async () => {
    const view = await mount();
    try {
      view.save.mockRejectedValue(
        new Error("Workflow version changed. Reopen the drawer."),
      );
      await click("Actions for Decision for {{fundingcalltitle}}");
      await click("Edit");
      await fill("subject", "Retained edit");
      await click("Save notification");
      await view.rerender();
      await click("Save notifications");
      expect(view.save.mock.calls[0][1].expectedRowVersion).toBe(3);
      await vi.waitFor(async () => {
        await act(async () => {
          await new Promise((resolve) => setTimeout(resolve, 0));
        });
        expect(document.querySelector('[role="alert"]')?.textContent).toContain(
          "Workflow version changed",
        );
      });
      expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
        "Retained edit",
      );
      expect(view.close).not.toHaveBeenCalled();
    } finally {
      await view.cleanup();
    }
  });

  it("renders view-only notification content without editing or saving controls", async () => {
    const view = await mount(false);
    try {
      expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
        "Application owner",
      );
      const labels = [...document.querySelectorAll("button")].map((button) =>
        button.textContent?.trim(),
      );
      expect(labels).not.toContain("Add notification");
      expect(labels).not.toContain("Save notifications");
      expect(
        document.querySelector('[aria-label^="Actions for Decision"]'),
      ).toBeNull();
      await click("Close");
      expect(view.save).not.toHaveBeenCalled();
    } finally {
      await view.cleanup();
    }
  });
});
