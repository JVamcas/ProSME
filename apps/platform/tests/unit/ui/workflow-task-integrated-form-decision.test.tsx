// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { TaskDetail } from "@/modules/work-queue/TaskTypes";
import { WorkflowTaskDecisionActions } from "@/modules/work-queue/ui/WorkflowTaskDecisionActions";

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

vi.mock("@/modules/work-queue/WorkQueueHooks", () => ({
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
      comment: { maxLength: 4_000, required: false },
      confirmation: { message: null, required: false },
      dueDate: { deadlineDays: null, required: false },
      editableFieldPaths: [],
      reasonCode: { options: [], required: false },
      reasonOrCommentRequired: false,
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
      `button[value="${selectedTask.actions[0]?.key}"]`,
    )?.click();
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
      return { transition: { targetStageName: null } };
    });

    await renderAndSubmit(task, beforeAction);

    expect(beforeAction).toHaveBeenCalledOnce();
    expect(calls).toEqual(["form", "action"]);
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
      transition: { targetStageName: null },
    });
    const holdTask = {
      ...task,
      actions: [{
        ...task.actions[0],
        actionType: "PUT_ON_HOLD",
        key: "PUT_ON_HOLD",
        label: "Put on hold",
      }],
    } as TaskDetail;

    await renderAndSubmit(holdTask, beforeAction);

    expect(beforeAction).not.toHaveBeenCalled();
    expect(mocks.mutateAsync).toHaveBeenCalledOnce();
  });
});
