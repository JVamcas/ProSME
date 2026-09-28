// @vitest-environment happy-dom

import { act } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  FormSubmissionMode,
  TaskFormData,
} from "@/modules/forms/FormTypes";

const mocks = vi.hoisted(() => ({
  data: null as TaskFormData | null,
  finalizeFormValues: vi.fn(),
}));

vi.mock("@/modules/forms/FormHooks", () => ({
  useTaskForm: () => ({ data: mocks.data, isError: false, isPending: false }),
}));

vi.mock("@/modules/work-queue/WorkQueueHooks", () => ({
  useEvaluateAuthoritativeEligibility: () => ({
    error: null,
    isPending: false,
    mutateAsync: vi.fn(),
  }),
}));

vi.mock("@/modules/forms/ui/renderer/DynamicFormController", () => ({
  useDynamicFormController: () => ({
    cancelNavigation: vi.fn(),
    complete: { error: null, isPending: false },
    completeFormValues: vi.fn(),
    confirmNavigation: vi.fn(),
    currentRevision: vi.fn(() => 0),
    finalizeFormValues: mocks.finalizeFormValues,
    hasUnsavedChanges: false,
    markSaved: vi.fn(),
    pendingNavigationHref: null,
    save: { error: null, isPending: false },
    saveDraftValues: vi.fn(),
    setValues: vi.fn(),
    values: {},
  }),
}));

vi.mock("@/modules/forms/ui/renderer/FormRenderer", () => ({
  FormRenderer: ({ children }: { children: ReactNode }) => (
    <form>{children}</form>
  ),
}));

import { DynamicFormTask } from "@/modules/forms/ui/renderer/DynamicFormTask";

function taskFormData(submissionMode: FormSubmissionMode): TaskFormData {
  return {
    context: {},
    response: null,
    schema: {
      fields: [],
      instructions: null,
      sections: [],
      submissionMode,
      submitLabel: "Complete form",
      versionId: "16f2a85b-82a6-4594-9d37-c8ce4f284443",
      versionNumber: 1,
    },
    taskRowVersion: 1,
  };
}

afterEach(() => {
  vi.clearAllMocks();
  document.body.replaceChildren();
});

describe("dynamic task form submission mode", () => {
  it("hides independent completion for an embedded explicit task form", async () => {
    mocks.data = taskFormData("EXPLICIT");
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<DynamicFormTask taskId="task-id" />);
    });

    expect(container.textContent).not.toContain("Complete form");
    await act(async () => root.unmount());
  });

  it("hides the submit control when the task action owns finalization", async () => {
    mocks.data = taskFormData("WITH_TASK_ACTION");
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<DynamicFormTask taskId="task-id" />);
    });

    expect(container.textContent).not.toContain("Complete form");
    expect(container.textContent).toContain("No changes yet");
    await act(async () => root.unmount());
  });

  it("exposes form finalization to the enclosing task action", async () => {
    mocks.data = taskFormData("EXPLICIT");
    const register = vi.fn();
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <DynamicFormTask
          onCompleteTaskForm={register}
          taskId="task-id"
        />,
      );
    });

    const complete = register.mock.calls.find(
      ([callback]) => typeof callback === "function",
    )?.[0] as (() => Promise<void>) | undefined;
    expect(complete).toBeTypeOf("function");
    await act(async () => complete?.());
    expect(mocks.finalizeFormValues).toHaveBeenCalledWith({});
    await act(async () => root.unmount());
  });
});
