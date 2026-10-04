// @vitest-environment happy-dom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { TaskDetail } from "@/modules/work-queue/TaskTypes";
import { WorkflowTaskDecisionActions } from "@/modules/workflows/ui/tasks/WorkflowTaskDecisionActions";

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  push: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("@/shared/ui/FormRichTextField", () => ({
  FormRichTextField: () => <div>Instructions for applicant</div>,
}));

vi.mock("sonner", () => ({
  toast: { error: mocks.toastError, success: mocks.toastSuccess },
}));

vi.mock("@/modules/work-queue/ui/useWorkQueue", () => ({
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
        confirmation: { message: null, required: false },
        dueDate: { deadlineDays: null, required: false },
        editableFieldPaths: [],
        reason: { maxLength: 4_000, required: false },
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

async function chooseAction(label: string) {
  await act(async () => {
    document
      .querySelector<HTMLButtonElement>('button[aria-label="Workflow actions"]')
      ?.click();
  });
  await act(async () => {
    [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')]
      .find((item) => item.textContent?.includes(label))
      ?.click();
  });
}

describe("workflow task decision dialog", () => {
  it.each([
    { editableFields: [] },
    { editableFields: [{ label: "Amount requested", path: "AMOUNT" }] },
  ])(
    "shows the runtime field selector without a separate reason for %j",
    async ({ editableFields }) => {
      const requestTask = {
        ...task,
        documentRequirements: [],
        actions: [
          {
            ...task.actions[0],
            actionType: "REQUEST_INFORMATION",
            label: "Request information",
            requiredInput: {
              ...task.actions[0].requiredInput,
              editableFields,
              editableFieldPaths: ["CLARIFICATION_RESPONSE", "AMOUNT"],
            },
          },
        ],
      } as TaskDetail;
      const container = document.createElement("div");
      document.body.append(container);
      const root = createRoot(container);
      try {
        await act(async () =>
          root.render(<WorkflowTaskDecisionActions task={requestTask} />),
        );
        await chooseAction("Request information");
        const dialog = document.querySelector('[role="dialog"]')!;
        expect(dialog.textContent).toContain("Application fields to open");
        expect(dialog.querySelector('textarea[name="reason"]')).toBeNull();
        expect(
          dialog.textContent?.includes(
            "This application has no editable answer fields",
          ),
        ).toBe(editableFields.length === 0);
      } finally {
        await act(async () => root.unmount());
      }
    },
  );

  it("opens the confirmation dialog and cancels without submitting", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () =>
      root.render(<WorkflowTaskDecisionActions task={task} />),
    );
    expect(document.querySelector('[role="dialog"]')).toBeNull();

    await chooseAction("Approve and advance");
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain(
      "Approve and advance",
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
    await chooseAction("Approve and advance");
    await act(async () => {
      [
        ...document.querySelectorAll<HTMLButtonElement>(
          '[role="dialog"] button',
        ),
      ]
        .find((button) => button.textContent === "Submit")
        ?.click();
    });

    expect(mocks.mutateAsync).toHaveBeenCalledOnce();
    expect(mocks.toastError).toHaveBeenCalledWith("Action failed");
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    await act(async () => root.unmount());
  });

  it.each(["REJECT", "APPROVE_ADVANCE"] as const)(
    "captures a required free-text reason for %s in one textarea",
    async (actionType) => {
      mocks.mutateAsync.mockResolvedValueOnce({
        transition: { targetStageName: null },
      });
      const rejectTask = {
        ...task,
        actions: [
          {
            ...task.actions[0],
            actionType,
            key: "REJECT",
            label: "Reject",
            presentation: { displayOrder: 1, variant: "danger" },
            requiredInput: {
              ...task.actions[0].requiredInput,
              reason: { maxLength: 4_000, required: true },
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
      await chooseAction("Reject");

      const dialog = document.querySelector('[role="dialog"]')!;
      expect(dialog.querySelectorAll("textarea")).toHaveLength(1);
      expect(dialog.textContent).toContain("Notes");
      expect(dialog.querySelector("select")).toBeNull();
      expect(dialog.querySelector('input[type="checkbox"]')).toBeNull();

      await act(async () => {
        [...dialog.querySelectorAll<HTMLButtonElement>("button")]
          .find((button) => button.textContent === "Submit")
          ?.click();
      });
      expect(mocks.mutateAsync).not.toHaveBeenCalled();
      expect(dialog.textContent).toContain("Enter a reason.");
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
          .find((button) => button.textContent === "Submit")
          ?.click();
      });

      expect(mocks.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            input: {
              actionType,
              reason: "Mandatory evidence was not supplied.",
            },
          }),
        }),
      );
      await act(async () => root.unmount());
    },
  );
  it("allows rejection without a reason when its setting is disabled", async () => {
    mocks.mutateAsync.mockResolvedValueOnce({ transition: {} });
    const optionalRejectTask = {
      ...task,
      actions: [{ ...task.actions[0], actionType: "REJECT", label: "Reject" }],
    } as TaskDetail;
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () =>
        root.render(<WorkflowTaskDecisionActions task={optionalRejectTask} />),
      );
      await chooseAction("Reject");
      expect(
        document.querySelector<HTMLTextAreaElement>('textarea[name="reason"]')!
          .required,
      ).toBe(false);
      await act(async () => {
        [
          ...document.querySelectorAll<HTMLButtonElement>(
            '[role="dialog"] button',
          ),
        ]
          .find((button) => button.textContent === "Submit")
          ?.click();
      });
      expect(mocks.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({ input: { actionType: "REJECT" } }),
        }),
      );
    } finally {
      await act(async () => root.unmount());
    }
  });
});
