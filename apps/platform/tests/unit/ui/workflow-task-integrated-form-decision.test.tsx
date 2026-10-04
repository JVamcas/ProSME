// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { TaskDetail } from "@/modules/work-queue/TaskTypes";
import { WorkflowTaskDecisionActions } from "@/modules/workflows/ui/tasks/WorkflowTaskDecisionActions";

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  push: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("sonner", () => ({
  toast: { error: mocks.toastError, success: vi.fn() },
}));

vi.mock("@/modules/work-queue/ui/useWorkQueue", () => ({
  useExecuteWorkflowTaskAction: () => ({
    isPending: false,
    mutateAsync: mocks.mutateAsync,
  }),
}));

const task = {
  actions: [{
    actionType: "APPROVE_ADVANCE",
    available: true,
    key: "ADVANCE",
    label: "Approve and advance",
    presentation: { displayOrder: 1, variant: "success" },
    requiredInput: {
      confirmation: { message: null, required: false },
      dueDate: { deadlineDays: null, required: false },
      editableFieldPaths: [],
      reason: { maxLength: 4_000, required: false },
      reviewDate: { required: false },
      target: { type: null, value: null },
    },
    runtimeVersion: 1,
    unavailableReason: null,
  }],
  stageInstanceId: "stage-id",
  taskInstanceId: "task-id",
  taskStatus: "IN_PROGRESS",
  workflowInstanceId: "workflow-id",
} as unknown as TaskDetail;

let root: Root | null = null;

afterEach(async () => {
  vi.clearAllMocks();
  if (root) await act(async () => root?.unmount());
  root = null;
  document.body.replaceChildren();
});

async function renderAndSubmit(
  selectedTask: TaskDetail,
  beforeAction: () => Promise<void>,
) {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(
    <WorkflowTaskDecisionActions
      beforeAction={beforeAction}
      task={selectedTask}
    />,
  ));
  await act(async () => {
    container.querySelector<HTMLButtonElement>(
      'button[aria-label="Workflow actions"]',
    )?.click();
  });
  await act(async () => {
    [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')]
      .find((item) => item.textContent?.includes(
        selectedTask.actions[0]?.label ?? "",
      ))
      ?.click();
  });
  await act(async () => {
    [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')]
      .find((button) => button.textContent === "Submit")
      ?.click();
  });
}

describe("integrated task-form decisions", () => {
  it("finalizes the form before executing a stage decision", async () => {
    const calls: string[] = [];
    const beforeAction = vi.fn(async () => {
      calls.push("form");
    });
    mocks.mutateAsync.mockImplementationOnce(async () => {
      calls.push("action");
      return { transition: { targets: [] } };
    });

    await renderAndSubmit(task, beforeAction);

    expect(beforeAction).toHaveBeenCalledOnce();
    expect(calls).toEqual(["form", "action"]);
  });

  it("keeps one dialog through form saving, action refresh, and navigation", async () => {
    let finishForm!: () => void;
    let finishAction!: (result: { transition: { targets: [] } }) => void;
    const beforeAction = vi.fn(() => new Promise<void>((resolve) => {
      finishForm = resolve;
    }));
    mocks.mutateAsync.mockImplementationOnce(() => new Promise((resolve) => {
      finishAction = resolve;
    }));

    await renderAndSubmit(task, beforeAction);
    const dialog = document.querySelector('[role="dialog"]');
    const submit = [...document.querySelectorAll<HTMLButtonElement>(
      '[role="dialog"] button',
    )].find((button) => button.textContent === "Submitting…");
    expect(dialog).not.toBeNull();
    expect(submit?.disabled).toBe(true);

    await act(async () => {
      root?.render(
        <WorkflowTaskDecisionActions
          beforeAction={beforeAction}
          task={{
            ...task,
            actions: task.actions.map((action) => ({
              ...action,
              available: false,
              unavailableReason: "Wait for the current task changes to save.",
            })),
          }}
        />,
      );
    });
    expect(document.querySelector('[role="dialog"]')).toBe(dialog);
    expect(mocks.mutateAsync).not.toHaveBeenCalled();

    await act(async () => {
      document.querySelector<HTMLButtonElement>(
        '[aria-label="Close dialog"]',
      )?.click();
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });
    expect(document.querySelector('[role="dialog"]')).toBe(dialog);

    await act(async () => {
      root?.render(
        <WorkflowTaskDecisionActions beforeAction={beforeAction} task={task} />,
      );
      finishForm();
    });
    expect(document.querySelector('[role="dialog"]')).toBe(dialog);
    expect(submit?.disabled).toBe(true);
    expect(mocks.mutateAsync).toHaveBeenCalledOnce();

    await act(async () => {
      root?.render(
        <WorkflowTaskDecisionActions
          task={{ ...task, taskStatus: "COMPLETED", actions: [] }}
        />,
      );
    });
    expect(document.querySelector('[role="dialog"]')).toBe(dialog);

    await act(async () => {
      finishAction({ transition: { targets: [] } });
    });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(mocks.push).toHaveBeenCalledWith("/admin/work-queue");

    await act(async () => {
      root?.render(<WorkflowTaskDecisionActions task={task} />);
    });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(beforeAction).toHaveBeenCalledOnce();
  });

  it("does not execute a decision when form finalization fails", async () => {
    const beforeAction = vi.fn().mockRejectedValue(new Error("Form invalid"));

    await renderAndSubmit(task, beforeAction);

    expect(mocks.mutateAsync).not.toHaveBeenCalled();
    expect(mocks.toastError).toHaveBeenCalledWith("Form invalid");
  });

  it("does not finalize the form for a non-decision action", async () => {
    const beforeAction = vi.fn();
    mocks.mutateAsync.mockResolvedValueOnce({
      transition: { targets: [] },
    });
    const holdTask = {
      ...task,
      actions: [{
        ...task.actions[0],
        actionType: "PUT_ON_HOLD",
        key: "PUT_ON_HOLD",
        label: "Put on hold",
        requiredInput: { ...task.actions[0].requiredInput, holdScopes: ["TASK"] },
      }],
    } as TaskDetail;

    await renderAndSubmit(holdTask, beforeAction);

    expect(beforeAction).not.toHaveBeenCalled();
    expect(mocks.mutateAsync).toHaveBeenCalledOnce();
  });
});
