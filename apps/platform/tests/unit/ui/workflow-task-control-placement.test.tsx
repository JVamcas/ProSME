// @vitest-environment happy-dom

import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import type {
  TaskDetail,
  WorkflowTaskAction,
} from "@/modules/work-queue/TaskTypes";
import { WorkflowTaskDecisionActions } from "@/modules/workflows/ui/tasks/WorkflowTaskDecisionActions";
import { WorkflowTaskWorkSections } from "@/modules/workflows/ui/WorkflowTaskWorkSections";
import { FormRenderer } from "@/modules/forms/ui/renderer/FormRenderer";
import { runtimeDefinition } from "../../support/form-runtime";

const mocks = vi.hoisted(() => ({ execute: vi.fn(), finalize: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/modules/work-queue/WorkQueueHooks", () => ({
  useExecuteWorkflowTaskAction: () => ({
    isPending: false,
    mutateAsync: mocks.execute,
  }),
}));
vi.mock("@/modules/workflows/ui/tasks/WorkflowTaskActions", () => ({
  WorkflowTaskActions: ({
    actions,
    onSelect,
  }: {
    actions: WorkflowTaskAction[];
    onSelect: (key: string) => void;
  }) => (
    <div>
      {actions.map((action) => (
        <button key={action.key} onClick={() => onSelect(action.key)}>
          {action.label}
        </button>
      ))}
    </div>
  ),
}));
(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function action(
  actionType: WorkflowTaskAction["actionType"],
  required = false,
): WorkflowTaskAction {
  return {
    actionType,
    available: true,
    key: actionType,
    label: actionType,
    runtimeVersion: 1,
    unavailableReason: null,
    presentation: { displayOrder: 1, variant: "outline" },
    requiredInput: {
      confirmation: { required: false, message: null },
      dueDate: { required: false, deadlineDays: null },
      editableFieldPaths: [],
      reason: { required, maxLength: 4000 },
      reviewDate: { required: false },
      target: { type: null, value: null },
      defaultDestinationStageId: "10000000-0000-4000-8000-000000000010",
      destinationStages: [
        {
          id: "10000000-0000-4000-8000-000000000010",
          name: "Previous",
          stableKey: "B",
        },
      ],
      controlDefaults: { dataHandling: "RETAIN" },
    },
  };
}
const task = {
  taskInstanceId: "task",
  stageInstanceId: "stage",
  workflowInstanceId: "workflow",
  taskStatus: "IN_PROGRESS",
  actions: [action("APPROVE_ADVANCE"), action("RETURN"), action("PUT_ON_HOLD")],
} as unknown as TaskDetail;

afterEach(() => {
  vi.clearAllMocks();
  document.body.replaceChildren();
});

function StepHarness({ mode }: { mode: "FORM" | "REVIEW" }) {
  const [final, setFinal] = useState(false);
  const definition = runtimeDefinition();
  definition.displayMode = "STEPS";
  const first = definition.sections[0];
  const second = {
    ...first,
    id: "10000000-0000-4000-8000-000000000099",
    key: "SECOND",
    title: "Second",
    order: 2,
  };
  definition.sections = [first, second];
  definition.fields = definition.fields
    .filter((field) => ["NAME", "NOTES"].includes(field.key))
    .map((field) => ({
      ...field,
      order: 1,
      sectionId: field.key === "NAME" ? first.id! : second.id,
    }));
  return (
    <>
      {mode === "FORM" ? (
        <FormRenderer
          definition={definition}
          formData={{ NAME: "Valid name", NOTES: "Saved notes" }}
          onChange={vi.fn()}
          onSubmit={vi.fn()}
          onFinalStepChange={setFinal}
        />
      ) : (
        <WorkflowTaskWorkSections
          checklistItems={[]}
          commentFields={[
            {
              key: "COMMENT",
              label: "Recommendation",
              helpText: "",
              mandatory: true,
            },
          ]}
          disabled={false}
          documentRequirements={[]}
          displayMode="STEP_PROGRESS"
          form={{ content: <p>Review form</p>, title: "Form" }}
          scoring={null}
          status={{
            form: "Required",
            checklist: "Required",
            documents: "Required",
            comments: "Required",
            scoring: "Required",
          }}
          onFinalStepChange={setFinal}
        />
      )}
      <WorkflowTaskDecisionActions
        task={task}
        showDecisionActions={final}
        beforeAction={mocks.finalize}
      />
    </>
  );
}

it.each(["FORM", "REVIEW"] as const)(
  "keeps controls visible and decisions on the last %s step",
  async (mode) => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    const hasDecision = () =>
      [...container.querySelectorAll("button")].some(
        (button) => button.textContent === "APPROVE_ADVANCE",
      );
    try {
      await act(async () => root.render(<StepHarness mode={mode} />));
      expect(container.textContent).toContain("RETURN");
      expect(container.textContent).toContain("PUT_ON_HOLD");
      expect(hasDecision()).toBe(false);
      await act(async () =>
        [...container.querySelectorAll("button")]
          .find((button) => button.textContent === "Next")!
          .click(),
      );
      expect(hasDecision()).toBe(true);
      expect(container.textContent).toContain("RETURN");
      await act(async () =>
        [...container.querySelectorAll("button")]
          .find((button) => button.textContent === "Back")!
          .click(),
      );
      expect(hasDecision()).toBe(false);
      expect(container.textContent).toContain("RETURN");
    } finally {
      await act(async () => root.unmount());
    }
  },
);

it.each([false, true])(
  "enforces only the configured Return reason requirement: %s",
  async (required) => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    mocks.execute.mockResolvedValue({ transition: { targets: [] } });
    try {
      await act(async () =>
        root.render(
          <WorkflowTaskDecisionActions
            task={{ ...task, actions: [action("RETURN", required)] }}
            showDecisionActions={false}
            beforeAction={mocks.finalize}
          />,
        ),
      );
      await act(async () =>
        [...container.querySelectorAll("button")]
          .find((button) => button.textContent === "RETURN")!
          .click(),
      );
      expect(
        document.querySelector<HTMLTextAreaElement>('[name="reason"]')!
          .required,
      ).toBe(required);
      await act(async () =>
        [...document.querySelectorAll("button")]
          .find((button) => button.textContent === "Submit")!
          .click(),
      );
      expect(mocks.finalize).not.toHaveBeenCalled();
      expect(mocks.execute.mock.calls.length).toBe(required ? 0 : 1);
      if (required) expect(document.body.textContent).toContain("reason");
    } finally {
      await act(async () => root.unmount());
    }
  },
);
