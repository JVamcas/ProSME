// @vitest-environment happy-dom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { TaskFormData } from "@/modules/forms/FormTypes";
import {
  formDraftAutosaveDelayMs,
  useDynamicFormController,
} from "@/modules/forms/ui/renderer/DynamicFormController";

const mocks = vi.hoisted(() => ({
  completeMutate: vi.fn(),
  push: vi.fn(),
  saveMutate: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
}));

vi.mock("@/modules/forms/FormHooks", () => ({
  useCompleteTaskForm: () => ({
    error: null,
    isPending: false,
    mutate: mocks.completeMutate,
  }),
  useSaveTaskForm: () => ({
    error: null,
    isPending: false,
    mutate: mocks.saveMutate,
  }),
}));

const taskId = "c6ee71ce-0ed0-43b9-9381-e2c568634364";
const versionId = "16f2a85b-82a6-4594-9d37-c8ce4f284443";

function taskFormData(): TaskFormData {
  return {
    context: {},
    schema: {
      fields: [],
      instructions: null,
      sections: [],
      submitLabel: "Submit",
      versionId,
      versionNumber: 4,
    },
    submission: {
      completedAt: null,
      definitionSnapshot: null,
      formVersionId: versionId,
      id: "response-id",
      rowVersion: 2,
      status: "DRAFT",
      taskInstanceId: taskId,
      values: { NOTES: "Saved note" },
    },
    taskRowVersion: 7,
  };
}

function Harness({ data }: { data: TaskFormData }) {
  const controller = useDynamicFormController(taskId, data);
  return (
    <div>
      <output>{JSON.stringify(controller.values)}</output>
      <button
        onClick={() => controller.setValues({ NOTES: "Changed note" })}
        type="button"
      >
        Change
      </button>
    </div>
  );
}

let root: Root | null = null;

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});

afterEach(async () => {
  if (root) {
    await act(async () => root?.unmount());
    root = null;
  }
  document.body.replaceChildren();
  vi.useRealTimers();
});

describe("dynamic Form draft persistence", () => {
  it("restores persisted partial values without saving on load", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => root?.render(<Harness data={taskFormData()} />));
    await act(async () => {
      vi.advanceTimersByTime(formDraftAutosaveDelayMs);
    });

    expect(container.querySelector("output")?.textContent).toBe(
      JSON.stringify({ NOTES: "Saved note" }),
    );
    expect(mocks.saveMutate).not.toHaveBeenCalled();
  });

  it("autosaves changed partial values after the debounce interval", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root?.render(<Harness data={taskFormData()} />));

    await act(async () => {
      container.querySelector("button")?.click();
    });
    await act(async () => {
      vi.advanceTimersByTime(formDraftAutosaveDelayMs - 1);
    });
    expect(mocks.saveMutate).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(mocks.saveMutate).toHaveBeenCalledWith(
      {
        expectedSubmissionRowVersion: 2,
        expectedTaskRowVersion: 7,
        values: { NOTES: "Changed note" },
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});
