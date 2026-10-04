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

afterEach(() => {
  vi.clearAllMocks();
  document.body.replaceChildren();
});

import {
  task,
  chooseAction,
} from "../../support/WorkflowTaskDecisionDialogFixture";

describe("workflow task information dialog", () => {
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
});
