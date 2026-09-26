// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { TaskDetail } from "@/modules/work-queue/TaskTypes";
import { WorkflowTaskDecisionActions } from "@/modules/work-queue/ui/WorkflowTaskDecisionActions";

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  push: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("sonner", () => ({
  toast: { error: mocks.toastError, success: mocks.toastSuccess },
}));

vi.mock("@/modules/work-queue/WorkQueueHooks", () => ({
  useExecuteWorkflowTaskAction: () => ({
    isPending: false,
    mutateAsync: mocks.mutateAsync,
  }),
}));

(
  globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT: boolean;
  }
).IS_REACT_ACT_ENVIRONMENT = true;

const task = {
  actions: [
    {
      actionType: "APPROVE_ADVANCE",
      available: true,
      key: "ADVANCE",
      label: "Approve and advance",
      presentation: { displayOrder: 1, variant: "success" },
      requiredInput: {
        comment: { maxLength: 4_000, required: false },
        confirmation: { message: null, required: false },
        dueDate: { deadlineDays: null, required: false },
        editableFieldKeys: [],
        reasonCode: { options: [], required: false },
        reasonOrCommentRequired: false,
        reviewDate: { required: false },
        target: { type: null, value: null },
      },
      runtimeVersion: 1,
      unavailableReason: null,
    },
  ],
  stageInstanceId: "stage-id",
  taskInstanceId: "task-id",
  taskStatus: "IN_PROGRESS",
  workflowInstanceId: "workflow-id",
} as unknown as TaskDetail;

afterEach(() => {
  vi.clearAllMocks();
  document.body.replaceChildren();
});

describe("workflow task decision dialog", () => {
  it("opens the confirmation dialog and cancels without submitting", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () =>
      root.render(<WorkflowTaskDecisionActions task={task} />),
    );
    expect(document.querySelector('[role="dialog"]')).toBeNull();

    await act(async () => {
      document
        .querySelector<HTMLButtonElement>('button[value="ADVANCE"]')
        ?.click();
    });
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
      "Confirm Approve and advance",
    );

    await act(async () => {
      [
        ...document.querySelectorAll<HTMLButtonElement>(
          '[role="dialog"] button',
        ),
      ]
        .find((button) => button.textContent === "Cancel")
        ?.click();
    });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(mocks.mutateAsync).not.toHaveBeenCalled();
    await act(async () => root.unmount());
  });

  it("shows a failed action in a toast", async () => {
    mocks.mutateAsync.mockRejectedValueOnce(new Error("Action failed"));
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () =>
      root.render(<WorkflowTaskDecisionActions task={task} />),
    );
    await act(async () => {
      document
        .querySelector<HTMLButtonElement>('button[value="ADVANCE"]')
        ?.click();
    });
    await act(async () => {
      [
        ...document.querySelectorAll<HTMLButtonElement>(
          '[role="dialog"] button',
        ),
      ]
        .find((button) => button.textContent === "Confirm Approve and advance")
        ?.click();
    });

    expect(mocks.mutateAsync).toHaveBeenCalledOnce();
    expect(mocks.toastError).toHaveBeenCalledWith("Action failed");
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    await act(async () => root.unmount());
  });

  it("captures a rejection reason in one textarea", async () => {
    mocks.mutateAsync.mockResolvedValueOnce({
      transition: { targetStageName: null },
    });
    const rejectTask = {
      ...task,
      actions: [
        {
          ...task.actions[0],
          actionType: "REJECT",
          key: "REJECT",
          label: "Reject",
          presentation: { displayOrder: 1, variant: "danger" },
          requiredInput: {
            ...task.actions[0].requiredInput,
            comment: { maxLength: 4_000, required: true },
          },
        },
      ],
    } as TaskDetail;
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<WorkflowTaskDecisionActions task={rejectTask} />);
    });
    await act(async () => {
      document
        .querySelector<HTMLButtonElement>('button[value="REJECT"]')
        ?.click();
    });

    const dialog = document.querySelector('[role="dialog"]')!;
    expect(dialog.querySelectorAll("textarea")).toHaveLength(1);
    expect(dialog.textContent).toContain("Reason");
    expect(dialog.querySelector("select")).toBeNull();
    expect(dialog.querySelector('input[type="checkbox"]')).toBeNull();

    const reason = dialog.querySelector<HTMLTextAreaElement>("textarea")!;
    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value",
      )?.set;
      valueSetter?.call(reason, "Mandatory evidence was not supplied.");
      reason.dispatchEvent(new Event("input", { bubbles: true }));
      reason.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(async () => {
      [...dialog.querySelectorAll<HTMLButtonElement>("button")]
        .find((button) => button.textContent === "Confirm Reject")
        ?.click();
    });

    expect(mocks.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          input: {
            actionType: "REJECT",
            comment: "Mandatory evidence was not supplied.",
          },
        }),
      }),
    );
    await act(async () => root.unmount());
  });
});
