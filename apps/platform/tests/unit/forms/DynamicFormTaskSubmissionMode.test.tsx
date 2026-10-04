// @vitest-environment happy-dom

import { act, useState } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  FormSubmissionMode,
  TaskFormData,
} from "@/modules/forms/FormTypes";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const mocks = vi.hoisted(() => ({
  data: null as TaskFormData | null,
  finalizeFormValues: vi.fn(),
  evaluate: vi.fn(),
}));

vi.mock("@/modules/forms/FormHooks", () => ({
  useTaskForm: () => ({ data: mocks.data, isError: false, isPending: false }),
}));

vi.mock("@/modules/work-queue/ui/useWorkQueue", () => ({
  useEvaluateAuthoritativeEligibility: () => ({
    error: null,
    isPending: false,
    mutateAsync: mocks.evaluate,
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
    draftIsValid: true,
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
import { WorkflowTaskActions } from "@/modules/workflows/ui/tasks/WorkflowTaskActions";

function TaskWithActionBar() {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  return (
    <>
      <DynamicFormTask
        eligibilityActionContainer={container}
        eligibilityTask
        taskId="task-id"
      />
      <WorkflowTaskActions
        actions={[]}
        additionalItems={[
          { id: "complete", label: "Complete Task", onAction: vi.fn() },
        ]}
        disabled={false}
        eligibilityActionRef={setContainer}
        onSelect={vi.fn()}
      />
    </>
  );
}

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
  it.each([false, true])(
    "runs eligibility from the lower action bar with a completed response: %s",
    async (completed) => {
      mocks.data = taskFormData("EXPLICIT");
      if (completed) {
        mocks.data.response = {
          id: "response-id",
          rowVersion: 3,
          status: "COMPLETED",
          values: {},
        } as NonNullable<TaskFormData["response"]>;
      }
      mocks.evaluate.mockResolvedValue({ terminalStatus: null });
      const container = document.createElement("div");
      document.body.append(container);
      const root = createRoot(container);

      await act(async () => root.render(<TaskWithActionBar />));

      const bar = container.querySelector(
        '[aria-labelledby="workflow-task-actions-heading"]',
      );
      const button = Array.from(bar?.querySelectorAll("button") ?? [])
        .find((element) => element.textContent === "Run eligibility ruleset");
      expect(bar?.textContent).toContain("Actions");
      expect(button).toBeDefined();
      expect(container.querySelector("form")?.textContent)
        .not.toContain("Run eligibility ruleset");
      expect(container.querySelectorAll("button"))
        .toHaveLength(2);

      await act(async () => button?.click());
      expect(mocks.evaluate).toHaveBeenCalledWith({
        expectedResponseRowVersion: completed ? 3 : undefined,
        expectedRowVersion: 1,
        values: {},
      });
      await act(async () => root.unmount());
    },
  );

  it.each([false, true])("offers ruleset execution with completed response: %s", async (completed) => {
    mocks.data = taskFormData("EXPLICIT");
    if (completed) {
      mocks.data.response = {
        id: "response-id",
        rowVersion: 3,
        status: "COMPLETED",
        values: {},
      } as NonNullable<TaskFormData["response"]>;
    }
    mocks.evaluate.mockResolvedValue({ terminalStatus: null });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(<DynamicFormTask eligibilityTask taskId="task-id" />);
    });
    const button = Array.from(container.querySelectorAll("button"))
      .find((element) => element.textContent === "Run eligibility ruleset");
    expect(button).toBeDefined();
    await act(async () => button?.click());
    expect(mocks.evaluate).toHaveBeenCalledWith({
      expectedResponseRowVersion: completed ? 3 : undefined,
      expectedRowVersion: 1,
      values: {},
    });
    await act(async () => root.unmount());
  });

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
