// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TaskDetail } from "@/modules/work-queue/TaskTypes";
import { WorkflowTaskDecisionActions } from "@/modules/workflows/ui/tasks/WorkflowTaskDecisionActions";
import {
  task,
  chooseAction,
} from "../../support/WorkflowTaskDecisionDialogFixture";

const mocks = vi.hoisted(() => ({ mutateAsync: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/modules/work-queue/ui/useWorkQueue", () => ({
  useExecuteWorkflowTaskAction: () => ({
    isPending: false,
    mutateAsync: mocks.mutateAsync,
  }),
}));
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | null = null;

afterEach(async () => {
  if (root) {
    await act(async () => root?.unmount());
  }
  root = null;
  document.body.replaceChildren();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

async function openHold(required: boolean) {
  const selectedTask = {
    ...task,
    actions: [
      {
        ...task.actions[0],
        actionType: "PUT_ON_HOLD",
        key: "HOLD",
        label: "Put on hold",
        requiredInput: {
          ...task.actions[0].requiredInput,
          holdScopes: ["TASK"],
          reviewDate: { required },
        },
      },
    ],
  } as TaskDetail;
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(<WorkflowTaskDecisionActions task={selectedTask} />),
  );
  await chooseAction("Put on hold");
  return document.querySelector('[role="dialog"]')!;
}

async function submit() {
  await act(async () => {
    [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')]
      .find((button) => button.textContent === "Submit")
      ?.click();
  });
}

describe("hold dialog", () => {
  it("shows the shared date-time picker and only permitted scope, submitting without a date", async () => {
    mocks.mutateAsync.mockResolvedValueOnce({ transition: {} });
    const dialog = await openHold(false);
    expect(dialog.querySelector('[aria-label="Open calendar"]')).not.toBeNull();
    expect(dialog.querySelector('[data-type="hour"]')).not.toBeNull();
    expect(dialog.querySelector('[data-type="minute"]')).not.toBeNull();
    expect(dialog.textContent).toContain("This task");
    expect(dialog.textContent).not.toContain("The application");
    expect(dialog.textContent).not.toContain("This stage");
    await submit();
    expect(mocks.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          input: { actionType: "PUT_ON_HOLD", scope: "TASK" },
        }),
      }),
    );
  });

  it("requires a date only when configured", async () => {
    const dialog = await openHold(true);
    await submit();
    expect(mocks.mutateAsync).not.toHaveBeenCalled();
    expect(dialog.textContent).toContain("Select a review date and time.");
  });

  it("accepts a review date and time when it is optional", async () => {
    mocks.mutateAsync.mockResolvedValueOnce({ transition: {} });
    const dialog = await openHold(false);
    // Happy DOM emits selectionchange synchronously when collapsing selection.
    // Prevent recursive selectionchange handling while editing contenteditable segments.
    vi.spyOn(window.getSelection()!, "collapse").mockImplementation(() => {});
    for (const [type, value] of [
      ["day", "10"],
      ["month", "12"],
      ["year", "2026"],
      ["hour", "14"],
      ["minute", "30"],
    ]) {
      const segment = dialog.querySelector<HTMLElement>(`[data-type="${type}"]`)!;
      await act(async () => {
        segment.focus();
      });
      for (const key of value) {
        await act(async () => {
          segment.dispatchEvent(
            new InputEvent("beforeinput", {
              bubbles: true,
              cancelable: true,
              inputType: "insertText",
              data: key,
            }),
          );
        });
        if (type === "minute" && key === "3") {
          expect(document.activeElement).toBe(segment);
          expect(segment.dataset.focused).toBe("true");
        }
      }
    }
    await submit();
    expect(mocks.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          input: {
            actionType: "PUT_ON_HOLD",
            scope: "TASK",
            reviewDate: new Date("2026-12-10T14:30").toISOString(),
          },
        }),
      }),
    );
  });
});
